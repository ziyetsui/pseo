/** Independent export-side projection of the already-published baseline relationships. */
export function websiteValidationGraph(graph, baseline, taxonomies, membership, baselineModels = []) {
  const nodes = [...graph.nodes], edges = [...graph.edges];
  const websiteTasks = new Set(['website','web-design','web-development','web-motion-design']);
  const websiteIds = new Set(edges.filter(edge => edge.type === 'used_for' && nodes.some(node => node.id === edge.to && node.slug === 'website')).map(edge => edge.from));
  const sourceFor = id => edges.find(edge => edge.from === id && edge.type === 'sourced_from')?.to;
  const caseSources = new Set(nodes.filter(node => node.type === 'website-case' && websiteIds.has(node.id)).map(node => sourceFor(node.id)));
  for (const source of caseSources) {
    const alias = nodes.find(node => node.promptOnly && sourceFor(node.id) === source);
    if (alias) websiteIds.delete(alias.id);
  }
  for (const edge of edges) if (edge.type === 'has_prompt' && websiteIds.has(edge.from)) websiteIds.delete(edge.to);
  const resolve = (axis,label) => {
    const term = taxonomies.find(term => term.axis === axis && [term.label,term.labelZh,...term.aliases].some(alias => alias?.toLowerCase() === label.toLowerCase()));
    const slug = term?.slug ?? label.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gu,'-').replace(/^-|-$/gu,'');
    return { id:term?.id ?? `${axis}:${slug}`,slug,label,type:axis === 'useCase' ? 'use-case' : axis };
  };
  for (const prompt of baseline) {
    const tasks = prompt.uses.map(label => resolve('useCase',label));
    if (!tasks.some(task => websiteTasks.has(task.slug)) || websiteIds.has(prompt.id)) continue;
    websiteIds.add(prompt.id);nodes.push({id:prompt.id,type:'prompt',slug:prompt.slug,label:prompt.title});
    for (const [relation,refs] of [['used_for',tasks],['designed_for',[...prompt.models,...baselineModels.filter(update=>update.id===prompt.id).map(update=>update.slug)].map(label => resolve('model',label))]]) for (const ref of refs) {
      const existing = nodes.find(node => node.type === ref.type && node.slug === ref.slug);
      if (!existing) nodes.push(ref);
      edges.push({from:prompt.id,to:existing?.id ?? ref.id,type:relation});
    }
  }
  if(membership){
    const categories=['web-design','app-development','creative-coding'];
    if(Object.keys(membership).length!==websiteIds.size||Object.keys(membership).some(id=>!websiteIds.has(id)||!categories.includes(membership[id])))throw new Error('Invalid Website category membership');
    for(let i=edges.length-1;i>=0;i--)if(websiteIds.has(edges[i].from)&&edges[i].type==='used_for')edges.splice(i,1);
    for(const slug of categories)nodes.push({id:`navigation:website-purpose:${slug}`,slug,label:slug,type:'use-case'});
    for(const [id,slug] of Object.entries(membership))edges.push({from:id,to:`navigation:website-purpose:${slug}`,type:'used_for'});
  }
  return { nodes,edges,websiteIds:[...websiteIds] };
}
export function readWebsiteViews(document) {
  return document.querySelectorAll('a[data-website-view]').map(link => ({
    id: link.getAttribute('data-website-view'), href: link.getAttribute('href'),
    axis: link.getAttribute('data-view-axis'), targetId: link.getAttribute('data-view-target') || null,
    count: Number(link.getAttribute('data-view-count')),
  }));
}
export function verifyWebsiteViewOutput(documents, receipt, graph, locale='zh-CN') {
  const root = `/${locale}/prompts/website`;
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
  if (!Array.isArray(graph.websiteIds)) throw new Error('Independent Website membership graph required');
  const websiteIds = new Set(graph.websiteIds);
  if (!all || all.href !== `${root}/views/all` || all.count !== websiteIds.size) throw new Error('Website all-cases view incomplete');
  const allIds = caseIds(all), promptIds = new Set(receipt.publishedPrompts.map(entry => entry.id));
  for (const id of imported) if (!allIds.has(id)) throw new Error('Website case missing from all view');
  for (const id of websiteIds) if (!allIds.has(id)) throw new Error('Website object missing from all view');
  for (const id of allIds) if (!imported.has(id) && !promptIds.has(id)) throw new Error('Unlisted Website object');
  const relations = { 'use-case':'used_for', model:'designed_for', tool:'built_with' };
  const nodes = new Map(graph.nodes.map(node => [node.id,node]));
  for (const view of views.filter(view => view.axis !== 'all')) {
    const relation = relations[view.axis];
    if (!relation || !view.targetId || !Number.isInteger(view.count) || view.count < 1) throw new Error('Invalid Website view descriptor');
    const target = nodes.get(view.targetId);
    if (!target || target.type !== view.axis || view.href !== `${root}/views/${view.axis}/${target.slug}`) throw new Error('Website view target differs from graph');
    const actual = caseIds(view);
    for (const id of actual) if (!allIds.has(id)) throw new Error('Website view escaped the collection');
    const expected = new Set(graph.edges.filter(edge => edge.type === relation && edge.to === view.targetId && websiteIds.has(edge.from)).map(edge => edge.from));
    if (actual.size !== expected.size || [...actual].some(id => !expected.has(id))) throw new Error('Website view membership differs from semantic edges');
  }
  for (const axis of Object.keys(relations)) if (!views.some(view => view.axis === axis)) throw new Error('Website view dimension missing');
  for (const edge of graph.edges.filter(edge => websiteIds.has(edge.from) && Object.values(relations).includes(edge.type))) {
    if (nodes.get(edge.to)?.slug === 'website') continue;
    if (!views.some(view => view.targetId === edge.to && relations[view.axis] === edge.type)) throw new Error('Website semantic target has no view');
  }
}
