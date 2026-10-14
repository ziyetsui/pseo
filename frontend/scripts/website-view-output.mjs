const root = '/zh-CN/prompts/website';
export function readWebsiteViews(document) {
  return document.querySelectorAll('a[data-website-view]').map(link => ({
    id: link.getAttribute('data-website-view'), href: link.getAttribute('href'),
    axis: link.getAttribute('data-view-axis'), targetId: link.getAttribute('data-view-target') || null,
    count: Number(link.getAttribute('data-view-count')),
  }));
}
export function verifyWebsiteViewOutput(documents, receipt, graph) {
  const directory = documents.get(root), views = receipt.publishedWebsiteViews;
  if (!directory || directory.querySelectorAll('[data-website-case]').length) throw new Error('Website entry must be a view directory');
  const renderedViews = readWebsiteViews(directory);
  if (!Array.isArray(views) || views.length < 4 || renderedViews.length !== views.length || renderedViews.some((view,index) => Object.keys(view).some(key => view[key] !== views[index]?.[key]))) throw new Error('Website view receipt differs from directory');
  if (new Set(views.map(view => view.href)).size !== views.length) throw new Error('Duplicate Website view route');
  const imported = new Set(receipt.publishedWebsites.map(entry => entry.id));
  const all = views.find(view => view.axis === 'all');
  const caseIds = view => {
    const document = documents.get(view.href);
    if (!document) throw new Error(`Website view is missing: ${view.href}`);
    const ids = document.querySelectorAll('[data-website-case]').map(element => element.getAttribute('data-website-case'));
    if (new Set(ids).size !== ids.length || ids.length !== view.count) throw new Error('Website view count differs from unique rendered cases');
    return new Set(ids);
  };
  if (!all || all.href !== `${root}/views/all` || all.count !== imported.size + 1) throw new Error('Website all-cases view incomplete');
  const allIds = caseIds(all), promptIds = new Set(receipt.publishedPrompts.map(entry => entry.id));
  for (const id of imported) if (!allIds.has(id)) throw new Error('Website case missing from all view');
  for (const id of allIds) if (!imported.has(id) && !promptIds.has(id)) throw new Error('Unlisted Website object');
  const relations = { 'use-case':'used_for', model:'designed_for', tool:'built_with' };
  const nodes = new Map(graph.nodes.map(node => [node.id,node]));
  for (const view of views.filter(view => view.axis !== 'all')) {
    const relation = relations[view.axis];
    if (!relation || !view.targetId || !Number.isInteger(view.count) || view.count < 1) throw new Error('Invalid Website view descriptor');
    const target = nodes.get(view.targetId);
    if (target && (target.type !== view.axis || view.href !== `${root}/views/${view.axis}/${target.slug}`)) throw new Error('Website view target differs from graph');
    const actual = caseIds(view);
    for (const id of actual) if (!allIds.has(id)) throw new Error('Website view escaped the collection');
    const expected = new Set(graph.edges.filter(edge => edge.type === relation && edge.to === view.targetId && imported.has(edge.from)).map(edge => edge.from));
    const scopedImported = [...actual].filter(id => imported.has(id));
    if (scopedImported.length !== expected.size || scopedImported.some(id => !expected.has(id))) throw new Error('Website view membership differs from semantic edges');
  }
  for (const axis of Object.keys(relations)) if (!views.some(view => view.axis === axis)) throw new Error('Website view dimension missing');
  for (const edge of graph.edges.filter(edge => imported.has(edge.from) && Object.values(relations).includes(edge.type))) {
    if (nodes.get(edge.to)?.slug === 'website') continue;
    if (!views.some(view => view.targetId === edge.to && relations[view.axis] === edge.type)) throw new Error('Website semantic target has no view');
  }
}
