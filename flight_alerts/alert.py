#!/usr/bin/env python3
"""
Flight price alert: MEX/NLU/TLC -> CZM (Cozumel).

Polls multiple sources in parallel for each origin, picks the cheapest valid
round-trip fare across providers, and classifies it as Low / Typical / High
using a Google-Flights-style +/-20% band around a 90-day rolling baseline.
Only emits an alert when at least one origin lands in the Low tier. Designed
to be run once per day from cron.

Sources are pluggable; ship list includes Kiwi.com Tequila (budget meta-
search, covers Volaris and VivaAerobus directly), Amadeus Self-Service (GDS,
covers Aeromexico and other full-service carriers), and Google Flights via
SerpAPI. Enable any subset in config.json.
"""

import argparse
import json
import os
import smtplib
import ssl
import sys
from datetime import date, datetime, timedelta
from email.message import EmailMessage
from pathlib import Path

from providers import REGISTRY, FareResult, FlightProvider

ROOT = Path(__file__).resolve().parent
DEFAULT_CONFIG = ROOT / "config.json"
HISTORY_FILE = ROOT / "price_history.json"

DESTINATION = "CZM"
EXCLUDED_DESTINATIONS = {"CUN", "TQO"}

# Google Flights buckets fares relative to the route's recent history. The
# exact thresholds aren't published, but the green/yellow/red coloring and
# the "less than usual" callout track roughly with a +/-20% band around the
# rolling average. We replicate that.
LOW_THRESHOLD = 0.80
HIGH_THRESHOLD = 1.20

HISTORY_WINDOW_DAYS = 90
MIN_SAMPLES_FOR_ROLLING = 7


def load_config(path: Path) -> dict:
    if not path.exists():
        sys.exit(
            f"Config not found at {path}. Copy config.example.json to config.json "
            f"and fill in credentials for the providers you want to enable."
        )
    with path.open() as f:
        return json.load(f)


def load_history() -> dict:
    if not HISTORY_FILE.exists():
        return {}
    with HISTORY_FILE.open() as f:
        return json.load(f)


def save_history(history: dict) -> None:
    with HISTORY_FILE.open("w") as f:
        json.dump(history, f, indent=2, sort_keys=True)


def build_providers(cfg: dict) -> list[FlightProvider]:
    providers = []
    for name, settings in cfg.get("providers", {}).items():
        if not settings.get("enabled"):
            continue
        cls = REGISTRY.get(name)
        if cls is None:
            print(f"[warn] unknown provider '{name}' in config; skipping",
                  file=sys.stderr)
            continue
        providers.append(cls(settings))
    return providers


def cheapest_across_providers(providers: list[FlightProvider], origin: str,
                              outbound: str, return_date: str, currency: str,
                              adults: int) -> tuple[FareResult | None, list[str]]:
    """Query every provider; return the cheapest result + per-provider notes."""
    notes: list[str] = []
    results: list[FareResult] = []
    for p in providers:
        try:
            r = p.search(origin, DESTINATION, EXCLUDED_DESTINATIONS,
                         outbound, return_date, currency, adults)
        except Exception as e:
            notes.append(f"{p.name}: error ({e})")
            continue
        if r is None:
            notes.append(f"{p.name}: no eligible fare")
            continue
        notes.append(f"{p.name}: {r.currency} {r.price:.2f} ({r.airline})")
        results.append(r)
    if not results:
        return None, notes
    results.sort(key=lambda r: r.price)
    return results[0], notes


def rolling_baseline(samples: list[dict], seed: float) -> tuple[float, str]:
    cutoff = date.today() - timedelta(days=HISTORY_WINDOW_DAYS)
    recent = [s["price"] for s in samples
              if date.fromisoformat(s["checked_on"]) >= cutoff]
    if len(recent) >= MIN_SAMPLES_FOR_ROLLING:
        return sum(recent) / len(recent), "rolling"
    return seed, "seed"


def classify(price: float, baseline: float) -> str:
    if price <= baseline * LOW_THRESHOLD:
        return "low"
    if price >= baseline * HIGH_THRESHOLD:
        return "high"
    return "typical"


def format_alert(low_results: list[dict], all_results: list[dict],
                 trip: dict, currency: str) -> str:
    header = "Low fare found" if low_results else "No low fares this run"
    lines = [
        f"{header}: {trip['outbound']} -> {trip['return_date']} "
        f"(round trip, {trip['adults']} adult{'s' if trip['adults'] != 1 else ''})",
    ]
    if low_results:
        lines += ["", "LOW fares (cheapest source per origin):"]
        for r in low_results:
            lines.append(
                f"  {r['origin']} -> {DESTINATION}  "
                f"{currency} {r['price']:.2f}  "
                f"(baseline {currency} {r['baseline']:.2f}, "
                f"{(1 - r['price'] / r['baseline']) * 100:.0f}% below; "
                f"{r['airline']} via {r['source']})"
            )
    lines += ["", "All origins this run:"]
    for r in all_results:
        if r["price"] is None:
            lines.append(f"  {r['origin']}: no eligible fare across providers")
        else:
            lines.append(
                f"  {r['origin']}: {currency} {r['price']:.2f} -> {r['tier'].upper()} "
                f"(via {r['source']}; baseline {currency} {r['baseline']:.2f}, "
                f"source: {r['baseline_source']})"
            )
        for note in r.get("notes", []):
            lines.append(f"      - {note}")
    return "\n".join(lines)


def send_email(cfg: dict, subject: str, body: str) -> None:
    smtp = cfg["smtp"]
    msg = EmailMessage()
    msg["From"] = smtp["from"]
    msg["To"] = ", ".join(smtp["to"])
    msg["Subject"] = subject
    msg.set_content(body)
    ctx = ssl.create_default_context()
    with smtplib.SMTP(smtp["host"], smtp["port"]) as server:
        server.starttls(context=ctx)
        server.login(smtp["username"], smtp["password"])
        server.send_message(msg)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default=str(DEFAULT_CONFIG))
    parser.add_argument("--dry-run", action="store_true",
                        help="Skip provider calls; classify a sample price.")
    parser.add_argument("--sample-price", type=float, default=149.0,
                        help="Price to classify when --dry-run is set.")
    args = parser.parse_args()

    cfg = load_config(Path(args.config))

    providers = build_providers(cfg)
    if not args.dry_run and not providers:
        sys.exit("No providers enabled in config; enable at least one under "
                 "'providers' or run with --dry-run.")

    today = date.today()
    outbound = today + timedelta(days=cfg["search"]["outbound_offset_days"])
    return_date = outbound + timedelta(days=cfg["search"]["trip_length_days"])
    trip = {
        "outbound": outbound.isoformat(),
        "return_date": return_date.isoformat(),
        "adults": cfg["search"]["adults"],
    }
    currency = cfg["search"]["currency"]

    history = load_history()
    all_results: list[dict] = []
    low_results: list[dict] = []

    for origin in cfg["origins"]:
        seed = cfg["seed_baselines"].get(origin)
        if seed is None:
            print(f"[warn] no seed baseline for {origin}, skipping",
                  file=sys.stderr)
            continue

        if args.dry_run:
            best = FareResult(price=args.sample_price, currency=currency,
                              airline="(dry-run)", source="(dry-run)")
            notes = ["dry run: no providers called"]
        else:
            best, notes = cheapest_across_providers(
                providers, origin, trip["outbound"], trip["return_date"],
                currency, trip["adults"])

        samples = history.setdefault(origin, [])
        baseline, source = rolling_baseline(samples, seed)

        if best is None:
            all_results.append({"origin": origin, "price": None,
                                "notes": notes})
            continue

        tier = classify(best.price, baseline)
        samples.append({"checked_on": today.isoformat(), "price": best.price})
        cutoff = today - timedelta(days=HISTORY_WINDOW_DAYS)
        history[origin] = [s for s in samples
                           if date.fromisoformat(s["checked_on"]) >= cutoff]

        result = {
            "origin": origin, "price": best.price, "baseline": baseline,
            "baseline_source": source, "tier": tier, "airline": best.airline,
            "source": best.source, "notes": notes,
        }
        all_results.append(result)
        if tier == "low":
            low_results.append(result)

    save_history(history)

    body = format_alert(low_results, all_results, trip, currency)
    if low_results:
        subject = f"[Flight alert] LOW fare to Cozumel ({len(low_results)} origin(s))"
        print(subject)
        print(body)
        if cfg.get("smtp", {}).get("enabled"):
            send_email(cfg, subject, body)
        return 0

    print(f"[{datetime.now().isoformat(timespec='seconds')}] no low fares; "
          f"checked {len(all_results)} origin(s).")
    print(body)
    return 0


if __name__ == "__main__":
    sys.exit(main())
