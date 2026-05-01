# Cozumel flight price alerts

Daily alert that watches round-trip fares from the three Mexico City–area
airports — **MEX** (Benito Juárez), **NLU** (Felipe Ángeles / AIFA), and
**TLC** (Toluca) — to **CZM** (Cozumel). Fires only when at least one
origin hits the *Low* tier. Cancún (CUN) and Tulum (TQO) are excluded by
design.

## Sources

Pluggable providers in `providers/`. Each one is independently enabled in
`config.json`; per-origin price is the cheapest result across all enabled
providers, so missing one source just means a slightly less complete
snapshot — it doesn't break the run.

| Provider                  | Coverage                                                        | Get a key                                          |
|---------------------------|-----------------------------------------------------------------|----------------------------------------------------|
| `kiwi`                    | Budget meta-search; strong on LCCs (Volaris, VivaAerobus)       | https://tequila.kiwi.com/portal/login              |
| `amadeus`                 | GDS; strong on full-service carriers (Aeromexico)               | https://developers.amadeus.com/                    |
| `serpapi_google_flights`  | Google Flights mirror (paid-only, optional)                     | https://serpapi.com/                               |

Adding more sources is a matter of dropping a new file into `providers/`
that subclasses `FlightProvider` and registering it in
`providers/__init__.py`. The orchestrator handles auth caching, error
isolation per provider, baseline tracking, and notification.

The Mexican carriers operating MEX/NLU/TLC → CZM (Aeromexico, Volaris,
VivaAerobus) don't expose public price APIs of their own, so each one is
reached through whichever aggregator covers it best — Kiwi for the LCCs,
Amadeus for Aeromexico via GDS.

## How tiers are decided

Google Flights labels fares **Low / Typical / High** relative to recent
prices on the route; the exact thresholds aren't published, but the
behavior tracks roughly with a ±20% band around the route's rolling
average. We replicate that:

| Tier    | Rule                                  |
|---------|---------------------------------------|
| Low     | price ≤ 80% of baseline               |
| Typical | between 80% and 120% of baseline      |
| High    | price ≥ 120% of baseline              |

The baseline is the rolling average of the last 90 days of observations
for that origin (auto-recorded in `price_history.json`). Until 7 daily
samples have accumulated, the baseline falls back to the per-origin seed
in `config.json`. The seeds shipped in `config.example.json` reflect
typical 2026 round-trip USD fares for each origin to CZM and can be tuned.

## Setup

1. Sign up for at least one provider above and grab credentials. Two
   sources is the recommended minimum (one budget aggregator + one GDS)
   so you catch both LCCs and full-service.
2. Copy the example config and fill in only the providers you want:

   ```sh
   cp flight_alerts/config.example.json flight_alerts/config.json
   ```

   Set each provider's `enabled` and credentials. Adjust
   `search.outbound_offset_days` / `trip_length_days` for the trip you
   care about. To get email instead of stdout, fill in `smtp` and set
   `smtp.enabled` to `true`.

3. Smoke-test without spending API quota:

   ```sh
   python3 flight_alerts/alert.py --dry-run --sample-price 140
   ```

4. Run for real:

   ```sh
   python3 flight_alerts/alert.py
   ```

   Exit code is 0 unless the config is missing; "no low fare" is normal
   and just prints a summary including each provider's result per origin.

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
- `config.example.json` — template; copy to `config.json`.
- `config.json` — your real config (gitignored).
- `price_history.json` — rolling per-origin price log (gitignored,
  auto-created).
