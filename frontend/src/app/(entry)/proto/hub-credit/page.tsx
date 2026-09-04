/* PROTOTYPE — /proto/hub-credit
 *
 * The credit line on the L1 hub's first screen (/{locale}/prompts). A separate
 * route from /proto/model-hero on purpose: that one still holds an open hero
 * decision and nothing here may disturb it.
 *
 * Screen one is reproduced from components/Hub.tsx byte for byte — the same
 * h1 and the same three paragraphs — because the L1 master freezes it ("SCREEN
 * ONE — frozen. One string, shared by all five directions, so the argument
 * cannot drift between variants"). The only thing that varies is what goes in
 * the <p class="sig"> slot after it.
 *
 * Below screen one this mounts the real HubReader and HubBrowse, so each
 * credit is judged above the page it actually sits on.
 *
 * Nothing in production imports this directory. Delete it when the decision
 * is written down.
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadCatalog } from "@/lib/catalog/server";
import { SiteHeader, SiteFooter } from "@/components/Chrome";
import { HubReader } from "@/components/HubReader";
import { HubBrowse } from "@/components/Browse";
import { Harness } from "./Harness";
import "./proto.css";

export const metadata: Metadata = { title: "Prototype · hub credit line", robots: "noindex, nofollow" };

/* Dev-only, fails closed: `output: 'export'` would otherwise carry the
 * prototype into a production build. Not notFound(), which breaks the export
 * rather than emptying the page. */
const DEV = process.env.NODE_ENV !== "production";

export default async function Page() {
  if (!DEV) return <main className="route-state"><h1>Not available</h1><p>This prototype route only renders in development.</p></main>;
  const catalog = await loadCatalog("zh-CN");
  if (!catalog) notFound();

  return <div className="prototype-magnetic hc-root"><div className="vme m-run taste" data-mode="run" data-field="magnet">
    <SiteHeader level="hub" locale={catalog.locale} />
    <main id="main">
      {/* Screen one: frozen argument + the varying .sig slot. */}
      <Harness total={catalog.prompts.length} />
      <div className="after">
        <HubReader catalog={catalog} />
        <HubBrowse catalog={catalog} />
      </div>
    </main>
    <SiteFooter catalog={catalog} level="hub" />
  </div></div>;
}
