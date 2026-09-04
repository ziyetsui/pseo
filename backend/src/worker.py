"""Cloudflare Python Worker composition root for the public read API."""

from pathlib import Path

from workers import asgi

from pseo.adapters.bundled_catalog import BundledCatalogRepository
from pseo.app import create_app
from pseo.infrastructure.settings import Settings

_CATALOG_PATH = Path(__file__).with_name("worker_catalog.json")

app = create_app(
    repository=BundledCatalogRepository(_CATALOG_PATH),
    settings=Settings(
        environment="beta",
        public_base_url="https://api-beta.ancher.space",
        public_base_description="Cloudflare beta",
        cors_origins=("https://beta.ancher.space",),
    ),
)

Default = asgi.entrypoint(app)
