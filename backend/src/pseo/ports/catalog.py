"""Read-side catalog repository port."""

from __future__ import annotations

from typing import Protocol

from pseo.domain.models import CatalogSnapshot


class CatalogRepository(Protocol):
    """Returns one immutable publication-derived snapshot."""

    def snapshot(self) -> CatalogSnapshot:
        """Return the active read snapshot without external I/O."""
