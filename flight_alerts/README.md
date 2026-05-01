# Cozumel flight price alerts

Daily alert that watches round-trip fares from the three Mexico City–area
airports — **MEX** (Benito Juárez), **NLU** (Felipe Ángeles / AIFA), and
**TLC** (Toluca) — to **CZM** (Cozumel). Fires only when at least one origin
hits the *Low* tier. Cancún (CUN) and Tulum (TQO) are excluded by design.

## How tiers are decided

Google Flights labels fares **Low / Typical / High** relative to recent
prices on the same route; the exact thresholds aren't published, but the
behavior tracks roughly with a ±20% band around the route's rolling
average. We replicate that:

| Tier    | Rule                                  |
|---------|---------------------------------------|
| Low     | price ≤ 80% of baseline               |
| Typical | between 80% and 120% of baseline      |
| High    | price ≥ 120% of baseline              |

The baseline is the rolling average of the last 90 days of observations for
that origin (auto-recorded in `price_history.json`). Until 7 samples have
accumulated, the baseline falls back to the per-origin seed in `config.json`.
The seeds shipped in `config.example.json` reflect typical 2026 round-trip
USD fares for each origin to CZM and can be tuned to taste.

## Setup

1. Get a SerpAPI key (free tier covers a daily check): https://serpapi.com/.
2. Copy the example config and fill it in:

   ```sh
   cp flight_alerts/config.example.json flight_alerts/config.json
   ```

   Set `serpapi_key`, adjust `search.outbound_offset_days` /
   `trip_length_days` to the trip you care about, and (optionally) enable
   SMTP under `smtp` for email delivery. If `smtp.enabled` is `false`, the
   alert is printed to stdout — fine for cron + local mail.

3. Smoke-test without spending an API call:

   ```sh
   python3 flight_alerts/alert.py --dry-run --sample-price 140
   ```

4. Run for real:

   ```sh
   python3 flight_alerts/alert.py
   ```

   Exit code is always 0 unless the config is missing; "no low fare" is a
   normal outcome and just prints a one-line summary.

## Schedule daily

Add to your crontab (`crontab -e`). Runs every day at 08:00 local time and
appends to a log:

```cron
0 8 * * * /usr/bin/python3 /path/to/consulting-directory/flight_alerts/alert.py >> /path/to/consulting-directory/flight_alerts/alert.log 2>&1
```

On macOS, `launchd` works equivalently; on a server you can use a systemd
timer. The script is stateful only via `price_history.json` next to it, so
nothing else has to be configured.

## Files

- `alert.py` — the script.
- `config.example.json` — template; copy to `config.json`.
- `config.json` — your real config (gitignored).
- `price_history.json` — rolling per-origin price log (gitignored,
  auto-created).
