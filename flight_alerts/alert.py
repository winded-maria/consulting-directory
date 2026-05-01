#!/usr/bin/env python3
"""
Flight price alert: MEX/NLU/TLC -> CZM (Cozumel).

Queries Google Flights via SerpAPI for each configured origin, classifies the
cheapest round-trip fare as Low / Typical / High using a Google-Flights-style
+/-20% band around a rolling baseline, and only emits an alert when at least
one origin is Low. Designed to be run once per day from cron.
"""

import argparse
import json
import os
import smtplib
import ssl
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta
from email.message import EmailMessage
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_CONFIG = ROOT / "config.json"
HISTORY_FILE = ROOT / "price_history.json"

# Allowed destination. Cancun (CUN) and Tulum (TQO) are explicitly excluded
# per the alert spec; any result not landing at CZM is dropped.
DESTINATION = "CZM"
EXCLUDED_DESTINATIONS = {"CUN", "TQO"}

# Google Flights buckets fares relative to the route's recent history. The
# exact thresholds aren't published, but Google's "less than usual" tip and
# the green/yellow/red coloring track roughly with a +/-20% band around the
# rolling average. We replicate that: anything >=20% below baseline is Low,
# within +/-20% is Typical, >=20% above is High.
LOW_THRESHOLD = 0.80
HIGH_THRESHOLD = 1.20

# How many recent observations to retain per origin for the rolling baseline.
HISTORY_WINDOW_DAYS = 90
# Minimum samples before we trust the rolling average; below this we fall
# back to the seed baseline in config.
MIN_SAMPLES_FOR_ROLLING = 7


def load_config(path: Path) -> dict:
    if not path.exists():
        sys.exit(
            f"Config not found at {path}. Copy config.example.json to config.json "
            f"and fill in your SerpAPI key."
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


def search_flights(api_key: str, origin: str, outbound: str, return_date: str,
                   currency: str, adults: int, timeout: int = 30) -> dict:
    """Call SerpAPI's google_flights engine for one origin->CZM round trip."""
    params = {
        "engine": "google_flights",
        "departure_id": origin,
        "arrival_id": DESTINATION,
        "outbound_date": outbound,
        "return_date": return_date,
        "currency": currency,
        "adults": str(adults),
        "type": "1",  # round trip
        "hl": "en",
        "api_key": api_key,
    }
    url = "https://serpapi.com/search.json?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def cheapest_price(payload: dict) -> tuple[float | None, dict | None]:
    """Pick the cheapest itinerary that actually lands at CZM."""
    candidates = []
    for key in ("best_flights", "other_flights"):
        for itinerary in payload.get(key, []) or []:
            price = itinerary.get("price")
            if price is None:
                continue
            legs = itinerary.get("flights", []) or []
            if not legs:
                continue
            final_arrival = legs[-1].get("arrival_airport", {}).get("id")
            if final_arrival in EXCLUDED_DESTINATIONS:
                continue
            if final_arrival != DESTINATION:
                continue
            candidates.append((float(price), itinerary))
    if not candidates:
        return None, None
    candidates.sort(key=lambda c: c[0])
    return candidates[0]


def rolling_baseline(samples: list[dict], seed: float) -> tuple[float, str]:
    """Average the last HISTORY_WINDOW_DAYS of samples; fall back to seed."""
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
    lines = [
        f"Low fare found: {trip['outbound']} -> {trip['return_date']} "
        f"(round trip, {trip['adults']} adult{'s' if trip['adults'] != 1 else ''})",
        "",
        "LOW fares:",
    ]
    for r in low_results:
        lines.append(
            f"  {r['origin']} -> {DESTINATION}  "
            f"{currency} {r['price']:.2f}  "
            f"(baseline {currency} {r['baseline']:.2f}, "
            f"{(1 - r['price'] / r['baseline']) * 100:.0f}% below; "
            f"{r['airline']})"
        )
    lines += ["", "All origins this run:"]
    for r in all_results:
        if r["price"] is None:
            lines.append(f"  {r['origin']}: no eligible fare")
            continue
        lines.append(
            f"  {r['origin']}: {currency} {r['price']:.2f} -> {r['tier'].upper()} "
            f"(baseline {currency} {r['baseline']:.2f}, source: {r['baseline_source']})"
        )
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
                        help="Skip the API call; classify a sample price.")
    parser.add_argument("--sample-price", type=float, default=149.0,
                        help="Price to classify when --dry-run is set.")
    args = parser.parse_args()

    cfg = load_config(Path(args.config))
    api_key = cfg.get("serpapi_key") or os.environ.get("SERPAPI_KEY", "")
    if not args.dry_run and not api_key:
        sys.exit("Missing SerpAPI key (config.serpapi_key or SERPAPI_KEY env).")

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
    all_results = []
    low_results = []

    for origin in cfg["origins"]:
        seed = cfg["seed_baselines"].get(origin)
        if seed is None:
            print(f"[warn] no seed baseline for {origin}, skipping", file=sys.stderr)
            continue

        if args.dry_run:
            price = args.sample_price
            airline = "(dry-run)"
        else:
            try:
                payload = search_flights(api_key, origin, trip["outbound"],
                                         trip["return_date"], currency,
                                         trip["adults"])
            except Exception as e:
                print(f"[error] {origin}: search failed: {e}", file=sys.stderr)
                all_results.append({"origin": origin, "price": None})
                continue
            price, itinerary = cheapest_price(payload)
            if price is None:
                all_results.append({"origin": origin, "price": None})
                continue
            airline = ", ".join(
                sorted({leg.get("airline", "?") for leg in itinerary["flights"]})
            )

        samples = history.setdefault(origin, [])
        baseline, source = rolling_baseline(samples, seed)
        tier = classify(price, baseline)

        samples.append({"checked_on": today.isoformat(), "price": price})
        cutoff = today - timedelta(days=HISTORY_WINDOW_DAYS)
        history[origin] = [s for s in samples
                           if date.fromisoformat(s["checked_on"]) >= cutoff]

        result = {
            "origin": origin, "price": price, "baseline": baseline,
            "baseline_source": source, "tier": tier, "airline": airline,
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
    for r in all_results:
        if r["price"] is None:
            print(f"  {r['origin']}: no eligible fare")
        else:
            print(f"  {r['origin']}: {currency} {r['price']:.2f} -> {r['tier']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
