"""Google Flights scrape via the `fast-flights` package. No signup or API
key required — the package builds a Google Flights URL with the encoded
search params and parses the rendered response.

Trade-offs vs the API providers:
  - No credentials needed.
  - Returns Google's native Low/Typical/High label for the route, which
    is what the alert ultimately cares about.
  - HTML scraping is fragile; if Google changes their layout the
    `fast-flights` package needs an update before this provider works
    again.
  - Heavy automated use from a single IP may get rate-limited by Google.

Install:  pip install fast-flights
"""

import re

from .base import FareResult, FlightProvider

PRICE_RE = re.compile(r"[\d,]+(?:\.\d+)?")
VALID_TIERS = {"low", "typical", "high"}


def _parse_price(s: str) -> float | None:
    if not s:
        return None
    m = PRICE_RE.search(s.replace(",", ""))
    if not m:
        return None
    try:
        return float(m.group())
    except ValueError:
        return None


class GoogleScrapeProvider(FlightProvider):
    name = "google_scrape"

    def search(self, origin, destination, excluded, outbound, return_date,
               currency, adults):
        try:
            from fast_flights import FlightData, Passengers, get_flights
        except ImportError as e:
            raise RuntimeError(
                "google_scrape requires the 'fast-flights' package; "
                "install with: pip install fast-flights"
            ) from e

        # excluded={CUN, TQO} is honored implicitly: we only ever query
        # to_airport=CZM, so a layover at CUN that ends at CZM is fine
        # (the trip still terminates at the requested airport) and a
        # final-destination CUN/TQO can't be returned.
        result = get_flights(
            flight_data=[
                FlightData(date=outbound, from_airport=origin,
                           to_airport=destination),
                FlightData(date=return_date, from_airport=destination,
                           to_airport=origin),
            ],
            trip="round-trip",
            seat="economy",
            passengers=Passengers(
                adults=adults, children=0,
                infants_in_seat=0, infants_on_lap=0,
            ),
            fetch_mode="fallback",
        )

        cheapest: float | None = None
        cheapest_airline = "?"
        for f in result.flights or []:
            price = _parse_price(getattr(f, "price", "") or "")
            if price is None:
                continue
            if cheapest is None or price < cheapest:
                cheapest = price
                cheapest_airline = getattr(f, "name", "?") or "?"
        if cheapest is None:
            return None

        external_tier = (getattr(result, "current_price", "") or "").strip().lower()
        if external_tier not in VALID_TIERS:
            external_tier = None

        return FareResult(
            price=cheapest,
            currency=currency,
            airline=cheapest_airline,
            source=self.name,
            external_tier=external_tier,
        )
