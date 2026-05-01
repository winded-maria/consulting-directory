"""Amadeus Self-Service flight-offers search. GDS coverage — strong for
Aeromexico and other full-service carriers. Free test environment available
at https://developers.amadeus.com/."""

import json
import time
import urllib.parse
import urllib.request

from .base import FareResult, FlightProvider

HOSTS = {
    "test": "https://test.api.amadeus.com",
    "production": "https://api.amadeus.com",
}


class AmadeusProvider(FlightProvider):
    name = "amadeus"

    def __init__(self, settings):
        super().__init__(settings)
        self._token: str | None = None
        self._token_expires_at: float = 0.0

    def _host(self) -> str:
        env = self.settings.get("environment", "test")
        if env not in HOSTS:
            raise RuntimeError(f"amadeus: unknown environment '{env}'")
        return HOSTS[env]

    def _auth(self) -> str:
        if self._token and time.time() < self._token_expires_at - 30:
            return self._token
        client_id = self.settings.get("client_id")
        client_secret = self.settings.get("client_secret")
        if not client_id or not client_secret:
            raise RuntimeError("amadeus: missing client_id / client_secret")

        body = urllib.parse.urlencode({
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
        }).encode("utf-8")
        req = urllib.request.Request(
            self._host() + "/v1/security/oauth2/token",
            data=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        self._token = data["access_token"]
        self._token_expires_at = time.time() + float(data.get("expires_in", 1799))
        return self._token

    def search(self, origin, destination, excluded, outbound, return_date,
               currency, adults):
        token = self._auth()
        params = {
            "originLocationCode": origin,
            "destinationLocationCode": destination,
            "departureDate": outbound,
            "returnDate": return_date,
            "adults": str(adults),
            "currencyCode": currency,
            "max": "20",
            "nonStop": "false",
        }
        url = self._host() + "/v2/shopping/flight-offers?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read().decode("utf-8"))

        offers = payload.get("data", [])
        offers.sort(key=lambda o: float(o["price"]["total"]))
        for offer in offers:
            itineraries = offer.get("itineraries", [])
            if not itineraries:
                continue
            outbound_segments = itineraries[0].get("segments", [])
            if not outbound_segments:
                continue
            final_arrival = outbound_segments[-1]["arrival"]["iataCode"]
            if final_arrival in excluded or final_arrival != destination:
                continue
            airline = ", ".join(offer.get("validatingAirlineCodes", [])) or "?"
            return FareResult(
                price=float(offer["price"]["total"]),
                currency=offer["price"].get("currency", currency),
                airline=airline,
                source=self.name,
            )
        return None
