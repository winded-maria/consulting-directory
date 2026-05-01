"""Google Flights via SerpAPI. Optional meta-source kept as one provider
among several; no longer the only input."""

import json
import urllib.parse
import urllib.request

from .base import FareResult, FlightProvider


class SerpApiGoogleFlightsProvider(FlightProvider):
    name = "serpapi_google_flights"

    def search(self, origin, destination, excluded, outbound, return_date,
               currency, adults):
        api_key = self.settings.get("api_key")
        if not api_key:
            raise RuntimeError("serpapi_google_flights: missing api_key")

        params = {
            "engine": "google_flights",
            "departure_id": origin,
            "arrival_id": destination,
            "outbound_date": outbound,
            "return_date": return_date,
            "currency": currency,
            "adults": str(adults),
            "type": "1",
            "hl": "en",
            "api_key": api_key,
        }
        url = "https://serpapi.com/search.json?" + urllib.parse.urlencode(params)
        with urllib.request.urlopen(url, timeout=30) as resp:
            payload = json.loads(resp.read().decode("utf-8"))

        candidates = []
        for key in ("best_flights", "other_flights"):
            for itinerary in payload.get(key, []) or []:
                price = itinerary.get("price")
                legs = itinerary.get("flights", []) or []
                if price is None or not legs:
                    continue
                final_arrival = legs[-1].get("arrival_airport", {}).get("id")
                if final_arrival in excluded or final_arrival != destination:
                    continue
                candidates.append((float(price), itinerary))
        if not candidates:
            return None

        candidates.sort(key=lambda c: c[0])
        price, itinerary = candidates[0]
        airline = ", ".join(
            sorted({leg.get("airline", "?") for leg in itinerary["flights"]})
        )
        return FareResult(price=price, currency=currency, airline=airline,
                          source=self.name)
