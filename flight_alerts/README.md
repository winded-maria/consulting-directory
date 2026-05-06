# Cozumel flight price alerts

Daily alert that watches round-trip fares from the three Mexico City–area
airports — **MEX** (Benito Juárez), **NLU** (Felipe Ángeles / AIFA), and
**TLC** (Toluca) — to **CZM** (Cozumel). Fires only when at least one
origin hits the *Low* tier. Cancún (CUN) and Tulum (TQO) are excluded by
design.

## Quickstart (no signups)

The default provider scrapes Google Flights via the
[`fast-flights`](https://pypi.org/project/fast-flights/) package — no API
key, no account, just a `pip install`. Setup:

```sh
pip install -r flight_alerts/requirements.txt
cp flight_alerts/config.example.json flight_alerts/config.json
python3 flight_alerts/alert.py
```

That's it. Run-time output prints each origin's cheapest fare and tier.
A "Low" tier on any origin triggers an alert (stdout by default; SMTP if
you flip `smtp.enabled` and fill the block in).

### Trade-offs of the scrape path

- HTML scraping is more fragile than an API; if Google changes their
  layout, `fast-flights` needs an update before this provider works
  again.
- Repeated requests from the same IP can get rate-limited by Google.
  One run per day — what cron does — is well below the threshold.
- Google's own **Low / Typical / High** label for the route comes back
  in the response, so when this provider supplies the cheapest fare we
  use Google's classification directly rather than emulating it.

## Optional: API providers

Pluggable providers live in `providers/`. Any subset can be enabled in
`config.json`; per-origin price is the cheapest result across all
enabled providers, with per-provider errors isolated so a single source
going down doesn't kill the run. These need signups but are more stable
than scraping.

| Provider                  | Coverage                                                | Get a key                                          |
|---------------------------|---------------------------------------------------------|----------------------------------------------------|
| `google_scrape`           | Google Flights via scrape (default; no signup)          | —                                                  |
| `kiwi`                    | Budget meta-search; strong on LCCs (Volaris, VivaAerobus)| https://tequila.kiwi.com/portal/login              |
| `amadeus`                 | GDS; strong on full-service carriers (Aeromexico)       | https://developers.amadeus.com/                    |
| `serpapi_google_flights`  | Google Flights mirror (paid)                            | https://serpapi.com/                               |

Adding more sources is a matter of dropping a new file into `providers/`
that subclasses `FlightProvider` and registering it in
`providers/__init__.py`.

The Mexican carriers operating MEX/NLU/TLC → CZM (Aeromexico, Volaris,
VivaAerobus) don't expose public price APIs of their own, so each one is
reached through whichever aggregator covers it best — Kiwi for the LCCs,
Amadeus for Aeromexico via GDS, and Google Flights (scrape or SerpAPI)
as a meta-source over all of them.

## How tiers are decided

When the cheapest fare comes from `google_scrape`, the orchestrator uses
**Google's own** Low/Typical/High label for the route — that's what the
"price tier" indicator on Google Flights shows.

When the cheapest fare comes from an API provider that doesn't expose
that label, the orchestrator falls back to a Google-Flights-style ±20%
band around the route's rolling baseline:

| Tier    | Rule                                  |
|---------|---------------------------------------|
| Low     | price ≤ 80% of baseline               |
| Typical | between 80% and 120% of baseline      |
| High    | price ≥ 120% of baseline              |

The baseline is the rolling average of the last 90 days of observations
for that origin (auto-recorded in `price_history.json`). Until 7 daily
samples have accumulated, the baseline falls back to the per-origin seed
in `config.json`. Seeds in `config.example.json` reflect typical 2026
round-trip USD fares for each origin to CZM and can be tuned.

## Schedule daily

Add to your crontab (`crontab -e`). Runs every day at 08:00 local time
and appends to a log:

```cron
0 8 * * * /usr/bin/python3 /path/to/consulting-directory/flight_alerts/alert.py >> /path/to/consulting-directory/flight_alerts/alert.log 2>&1
```

On macOS, `launchd` works equivalently; on a server, a systemd timer is
fine. The script's only state is `price_history.json` next to it.

## Files

- `alert.py` — orchestration, baseline/tier logic, notification.
- `providers/` — one file per source.
- `requirements.txt` — `fast-flights` for the no-signup default path.
- `config.example.json` — template; copy to `config.json`.
- `config.json` — your real config (gitignored).
- `price_history.json` — rolling per-origin price log (gitignored,
  auto-created).
