"""Provider contract: each source returns the cheapest valid fare or None."""

from dataclasses import dataclass


@dataclass
class FareResult:
    price: float
    currency: str
    airline: str
    source: str


class FlightProvider:
    """Subclasses must set `name` and implement `search`."""

    name: str = ""

    def __init__(self, settings: dict):
        self.settings = settings

    def search(self, origin: str, destination: str, excluded: set[str],
               outbound: str, return_date: str, currency: str,
               adults: int) -> FareResult | None:
        raise NotImplementedError
