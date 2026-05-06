from .base import FareResult, FlightProvider
from .amadeus import AmadeusProvider
from .google_scrape import GoogleScrapeProvider
from .kiwi import KiwiProvider
from .serpapi import SerpApiGoogleFlightsProvider

REGISTRY: dict[str, type[FlightProvider]] = {
    "google_scrape": GoogleScrapeProvider,
    "kiwi": KiwiProvider,
    "amadeus": AmadeusProvider,
    "serpapi_google_flights": SerpApiGoogleFlightsProvider,
}

__all__ = ["FareResult", "FlightProvider", "REGISTRY"]
