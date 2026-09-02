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
