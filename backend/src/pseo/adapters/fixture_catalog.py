"""Compatibility name for the Git-backed internal-beta fixture adapter."""

from pseo.adapters.git_catalog import GitCatalogRepository

# Existing callers use this name. The fixture is no longer a hand-authored
# second catalog: it reads the shared, verified Git publication snapshot.
FixtureCatalogRepository = GitCatalogRepository

__all__ = ["FixtureCatalogRepository"]
