from .base import FareResult, FlightProvider
from .amadeus import AmadeusProvider
from .kiwi import KiwiProvider
from .serpapi import SerpApiGoogleFlightsProvider

REGISTRY: dict[str, type[FlightProvider]] = {
    "kiwi": KiwiProvider,
    "amadeus": AmadeusProvider,
    "serpapi_google_flights": SerpApiGoogleFlightsProvider,
}

__all__ = ["FareResult", "FlightProvider", "REGISTRY"]
