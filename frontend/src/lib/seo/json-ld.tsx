import { absoluteUrl } from "./site";

export interface BreadcrumbItem {
  name: string;
  /** Locale-prefixed path from the route builder. */
  path: string;
}

export interface BreadcrumbListJsonLd {
  "@context": "https://schema.org";
  "@type": "BreadcrumbList";
  itemListElement: {
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }[];
}

export function breadcrumbList(items: readonly BreadcrumbItem[]): BreadcrumbListJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export interface CollectionPageListItem {
  url: string;
  name: string;
}

export interface CollectionPageJsonLd {
  "@context": "https://schema.org";
  "@type": "CollectionPage";
  name: string;
  description: string;
  url: string;
  mainEntity: {
    "@type": "ItemList";
    numberOfItems: number;
    itemListElement: {
      "@type": "ListItem";
      position: number;
      url: string;
      name: string;
    }[];
  };
}

export interface CollectionPageInput {
  name: string;
  description: string;
  /** Absolute canonical URL of the page this JSON-LD describes. */
  url: string;
  /**
   * The items to list, in the order they should be numbered. Must mirror what
   * the page actually renders above the fold — every url here should resolve
   * to a real `<a href>` on the page, so JSON-LD and visible content agree.
   */
  itemUrls: readonly CollectionPageListItem[];
}

/**
 * `CollectionPage` + `ItemList` JSON-LD for an L1/L2/L3 listing page. Kept
 * generic (no locale, no `isPartOf`) so callers can spread extra fields onto
 * the result when they need them, e.g. `{ ...collectionPage(...), inLanguage,
 * isPartOf }`.
 */
export function collectionPage({
  name,
  description,
  url,
  itemUrls,
}: CollectionPageInput): CollectionPageJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: itemUrls.length,
      itemListElement: itemUrls.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: item.url,
        name: item.name,
      })),
    },
  };
}

/**
 * `<` is escaped so no string inside the payload can terminate the surrounding
 * `<script>` element.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Escaped by serializeJsonLd above; JSON-LD has no other injection surface.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
