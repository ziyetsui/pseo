const localeRoute = /^\/(en|zh-CN)(?=\/|$)/;
const structuralTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'nav', 'section', 'article', 'form', 'button', 'input', 'select', 'textarea', 'details', 'summary']);

function normalizeHref(href) {
  if (!href) return href;
  if (href.startsWith('/en/') || href.startsWith('/zh-CN/')) return href.replace(localeRoute, '/{locale}');
  return href;
}

function controls(document) {
  const main = document.querySelector('main');
  if (!main) throw new Error('Missing main content');
  const signature = [];
  const visit = node => {
    if (!node.rawTagName) return;
    const tag = node.rawTagName.toLowerCase();
    if (structuralTags.has(tag)) signature.push([tag, ...(tag === 'input' ? [node.getAttribute('type') ?? 'text'] : []), ...(tag === 'button' ? [node.getAttribute('type') ?? 'submit'] : [])]);
    for (const child of node.childNodes ?? []) visit(child);
  };
  visit(main);
  return signature;
}

function internalLinks(document) {
  return document.querySelectorAll('a[href]').map(link => link.getAttribute('href'))
    .filter(href => href?.startsWith('/') && !href.startsWith('//'))
    .map(normalizeHref).sort();
}

/** A built pair must expose the same pages, controls, and internal destinations. */
export function verifyBilingualOutput(documents) {
  const pages = [...documents.keys()].filter(route => localeRoute.test(route));
  for (const route of pages) {
    const locale = route.match(localeRoute)[1];
    const counterpart = route.replace(localeRoute, locale === 'en' ? '/zh-CN' : '/en');
    if (!documents.has(counterpart)) throw new Error(`Bilingual page missing: ${route} → ${counterpart}`);
    if (locale !== 'en') continue;
    const english = documents.get(route), chinese = documents.get(counterpart);
    const englishControls = controls(english), chineseControls = controls(chinese);
    if (JSON.stringify(englishControls) !== JSON.stringify(chineseControls)) {
      const index = englishControls.findIndex((value, at) => JSON.stringify(value) !== JSON.stringify(chineseControls[at]));
      throw new Error(`Bilingual controls differ: ${route} ↔ ${counterpart} at ${index}: ${JSON.stringify(englishControls.slice(index, index + 4))} vs ${JSON.stringify(chineseControls.slice(index, index + 4))}`);
    }
    const englishLinks = internalLinks(english), chineseLinks = internalLinks(chinese);
    if (JSON.stringify(englishLinks) !== JSON.stringify(chineseLinks)) {
      const index = englishLinks.findIndex((value, at) => value !== chineseLinks[at]);
      throw new Error(`Bilingual navigation differs: ${route} ↔ ${counterpart} at ${index}: ${JSON.stringify(englishLinks.slice(index, index + 4))} vs ${JSON.stringify(chineseLinks.slice(index, index + 4))}`);
    }
  }
}
