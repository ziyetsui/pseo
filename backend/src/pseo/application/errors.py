"""Framework-neutral application errors."""

from __future__ import annotations

from dataclasses import dataclass

from pseo.domain.models import LocaleVariantRef


@dataclass(frozen=True, slots=True)
class FieldIssue:
    path: str
    code: str
    message: str
    locale_variants: tuple[LocaleVariantRef, ...] = ()


class CatalogError(Exception):
    """Base error surfaced by read use cases."""

    code = "CATALOG_ERROR"
    title = "Catalog error"

    def __init__(self, detail: str, *, issues: tuple[FieldIssue, ...] = ()) -> None:
        super().__init__(detail)
        self.detail = detail
        self.issues = issues


class InvalidQueryError(CatalogError):
    code = "INVALID_QUERY"
    title = "Invalid query"


class ResourceNotFoundError(CatalogError):
    code = "RESOURCE_NOT_FOUND"
    title = "Resource not found"


class LocaleVariantNotFoundError(CatalogError):
    code = "LOCALE_VARIANT_NOT_FOUND"
    title = "Locale variant not found"


class ContentGoneError(CatalogError):
    code = "CONTENT_GONE"
    title = "Content gone"
