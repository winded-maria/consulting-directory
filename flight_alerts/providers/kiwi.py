"""Kiwi.com Tequila API — budget meta-search covering most LCCs (Volaris,
VivaAerobus) plus full-service carriers. Free tier requires a Tequila API
key from https://tequila.kiwi.com/portal/login."""

import json
import urllib.parse
import urllib.request
from datetime import date

from .base import FareResult, FlightProvider

ENDPOINT = "https://api.tequila.kiwi.com/v2/search"


def _ddmmyyyy(iso: str) -> str:
    return date.fromisoformat(iso).strftime("%d/%m/%Y")


class KiwiProvider(FlightProvider):
    name = "kiwi"

    def search(self, origin, destination, excluded, outbound, return_date,
               currency, adults):
        api_key = self.settings.get("api_key")
        if not api_key:
            raise RuntimeError("kiwi: missing api_key")

        params = {
            "fly_from": origin,
            "fly_to": destination,
            "date_from": _ddmmyyyy(outbound),
            "date_to": _ddmmyyyy(outbound),
            "return_from": _ddmmyyyy(return_date),
            "return_to": _ddmmyyyy(return_date),
            "adults": str(adults),
            "curr": currency,
            "sort": "price",
            "limit": "30",
            "max_stopovers": "2",
        }
        url = ENDPOINT + "?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={"apikey": api_key})
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read().decode("utf-8"))

        for itin in payload.get("data", []):
            route = itin.get("route", [])
            if not route:
                continue
            final_arrival = route[-1].get("flyTo")
            if final_arrival in excluded or final_arrival != destination:
                continue
            airline_codes = sorted({leg.get("airline", "?") for leg in route})
            return FareResult(
                price=float(itin["price"]),
                currency=currency,
                airline=", ".join(airline_codes),
                source=self.name,
            )
        return None
