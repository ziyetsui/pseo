import type { Catalog } from "@/lib/catalog/types";
import { SiteFooter, SiteHeader } from "@/components/Chrome";
import { DeckBrowse } from "@/components/Browse";
import { DeckReader } from "@/components/DeckReader";

export function Deck({ catalog, contentType }: { catalog: Catalog; contentType: "image" | "video" }) {
  const prompts = catalog.prompts.filter(prompt => prompt.kind === contentType);
  const sectionCatalog = { ...catalog, prompts };
  return <div className="prototype-deck"><div className="v4 taste"><SiteHeader level="deck" locale={catalog.locale} contentType={contentType} /><main id="main"><div className="wrap"><DeckReader catalog={sectionCatalog} contentType={contentType} /><DeckBrowse catalog={catalog} prompts={prompts} /></div></main><SiteFooter catalog={catalog} level="deck" /></div></div>;
}
