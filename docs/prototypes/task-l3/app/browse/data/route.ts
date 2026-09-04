import { materials } from '../../../materials';

/* The payload the standalone single-file picker is baked from. It exists so the static file is
   generated from the same fixture the React harness reads, instead of a hand-copied second dataset
   that drifts the moment the taxonomy changes. Prototype-only, like everything else here. */
export const dynamic = 'force-dynamic';
export function GET() {
  const catalog = materials();
  const site = 'http://127.0.0.1:3000';
  return Response.json({
    locale: catalog.locale,
    revision: catalog.revision,
    observedAt: catalog.observedAt,
    prompts: catalog.prompts.map(prompt => ({
      id: prompt.id,
      title: prompt.title,
      handle: prompt.handle,
      kind: prompt.kind,
      img: prompt.img,
      likes: prompt.likes,
      saves: prompt.saves,
      publishedAt: prompt.publishedAt,
      sourceUrl: prompt.source.url,
      prompt: prompt.prompt,
      language: prompt.language,
      styles: prompt.styles.map(ref => ({ slug: ref.slug, label: ref.label })),
      href: prompt.href,
      uses: prompt.useCases.map(ref => ({ slug: ref.slug, label: ref.label })),
      models: prompt.models.map(ref => ({ slug: ref.slug, label: ref.label })),
    })),
    tasks: catalog.useCases.map(ref => ({ slug: ref.slug, label: ref.label, count: ref.count, href: `${site}/${catalog.locale}/prompts/use-cases/${ref.slug}` })),
    site,
  }, { headers: { 'x-robots-tag': 'noindex, nofollow' } });
}
