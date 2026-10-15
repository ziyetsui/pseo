import { createHash } from 'node:crypto';
import { normalizePromptProposal } from '../../cms/src/proposals/promptProposal.ts';

const hash = value => createHash('sha256').update(value).digest('hex');
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || hash(value).slice(0, 16);
const missingPrompt = value => typeof value !== 'string' || !value.trim() || /^(未在|未找到|原帖或同作者已读取回复包含提示词|no prompt found|not (?:found|available)|unknown|n\/a)/iu.test(value.trim());
function https(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Source/media must be HTTPS without credentials');
  return url.href;
}
function source(value) {
  const url = https(value);
  const parsed = new URL(url);
  if (['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(parsed.hostname)) {
    const match = parsed.pathname.match(/^\/([^/]+)\/status\/(\d+)(?:\/|$)/u);
    if (!match) return { url, key: `url:${url}`, platform: 'url', sourceId: url, handle: /^\/[A-Za-z0-9_]+\/?$/u.test(parsed.pathname) ? parsed.pathname.split('/')[1] : null };
    return { url: `https://x.com/${match[1]}/status/${match[2]}`, key: `x:${match[2]}`, platform: 'x', sourceId: match[2], handle: match[1] };
  }
  return { url, key: `url:${url}`, platform: 'url', sourceId: url, handle: null };
}

/** Pure local intake: no network, DB, rights approval, mirror writes or publication. */
export function buildIntake({ websites, gallery, observedAt, upstreamCommit, websiteMedia = [] }) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(observedAt) || Number.isNaN(Date.parse(observedAt))) throw new Error('observedAt must be an ISO UTC instant');
  if (!/^[a-f0-9]{40}$/u.test(upstreamCommit)) throw new Error('upstreamCommit must pin a Git SHA');
  if (!Array.isArray(websites) || !Array.isArray(gallery.cases)) throw new Error('Input collections must be arrays');
  const nodes = new Map(), edges = new Map(), proposals = new Map(), reviews = [], sourceTexts = new Map(), identities = new Set();
  let duplicates = 0, conflicts = 0;
  const node = (type, key, fields) => {
    const id = `${type === 'prompt' ? 'prm' : type.replaceAll('-', '')}_${hash(key).slice(0, 32)}`;
    if (!nodes.has(id)) nodes.set(id, { id, type, ...fields });
    return id;
  };
  const edge = (from, type, to) => edges.set(`${from}:${type}:${to}`, { from, type, to });
  const term = (from, type, label, relation, explicitSlug) => {
    if (typeof label !== 'string' || !label.trim()) return;
    const termSlug = explicitSlug ?? slug(label);
    const to = node(type, termSlug, { slug: termSlug, label });
    edge(from, relation, to);
  };
  const items = [
    ...websites.map(item => ({ item, namespace: 'websites', title: item.title, text: item.prompt, url: item.post_url })),
    ...gallery.cases.map(item => ({ item, namespace: 'gpt-image-2', title: item.title, text: item.prompt, url: item.sourceUrl || item.githubUrl })),
  ];
  for (const { item, namespace, title, text, url } of items) {
    if (!title || typeof title !== 'string') throw new Error('Case title is required');
    const src = source(url), hasPrompt = !missingPrompt(text), reasons = ['editorial_review', 'rights_review', 'taxonomy_media_review'];
    if (src.platform !== 'x') reasons.push('original_post_not_identified');
    const identity = `${src.key}:${hasPrompt ? hash(text) : `case:${item.project_id || item.id}`}`;
    const type = hasPrompt ? 'prompt' : 'website-case';
    const objectId = node(type, identity, { title, summary: namespace === 'websites' ? item.description ?? null : null, ...(hasPrompt ? { prompt: text } : {}), state: 'draft', rightsStatus: 'review_required', robots: 'noindex,nofollow' });
    if (identities.has(identity)) { duplicates++; reasons.push('duplicate'); }
    identities.add(identity);
    const srcId = node('source', src.key, { url: src.url, platform: src.platform, sourceId: src.sourceId, observedAt, publishedAt: item.published_at ?? null, attributionLabel: item.sourceLabel ?? item.author ?? null, promptEvidenceRef: item.prompt_evidence_ref ?? null });
    edge(objectId, 'sourced_from', srcId);
    const label = item.author ?? item.sourceLabel ?? null;
    const handle = src.handle ?? (typeof label === 'string' && /^@[A-Za-z0-9_]{1,15}$/u.test(label) ? label.slice(1) : null);
    if (!handle) reasons.push('creator_not_identified');
    if (handle) {
      const creator = node('creator', handle.toLowerCase(), { handle, url: `https://x.com/${encodeURIComponent(handle)}` });
      edge(objectId, 'created_by', creator);
      edge(srcId, 'published_by', creator);
    }
    if (hasPrompt) {
      const prior = sourceTexts.get(src.key);
      if (src.platform === 'x' && prior && !prior.has(hash(text))) { conflicts++; reasons.push('source_prompt_conflict'); }
      if (!prior) sourceTexts.set(src.key, new Set());
      sourceTexts.get(src.key).add(hash(text));
      // CMS contract stores editorial locale independently of the unmodified prompt language.
      const locale = /[\u3400-\u9fff]/u.test(title) ? 'zh-CN' : 'en';
      const body = {
        schemaVersion: 1, operation: 'create_prompt', expectedState: 'absent',
        prompt: { artifactKey: objectId, contentType: namespace === 'websites' ? 'other' : 'image', sourceLocale: locale, text },
        locale: { locale, slug: `${namespace === 'websites' ? 'website' : 'gpt-image-2'}-${hash(identity).slice(0, 24)}`, title, summary: namespace === 'websites' ? item.description ?? null : null, bodyMarkdown: null },
        source: { platform: src.platform, url: src.url, id: src.sourceId, creatorHandle: handle, publishedDate: item.published_at ? item.published_at.slice(0, 10) : null, observedAt },
      };
      try {
        normalizePromptProposal(body);
        proposals.set(objectId, { idempotencyKey: `case-import-v1:${objectId}:${hash(JSON.stringify(body)).slice(0, 24)}`, body });
      } catch (error) {
        reasons.push('proposal_contract_blocked');
        // Content is retained in intake; API validation rejection cannot be bypassed.
        reasons.push(error.code ?? 'PROMPT_PROPOSAL_INVALID');
      }
    } else reasons.push('missing_prompt');
    if (namespace === 'websites') {
      term(objectId, 'use-case', 'Website', 'used_for', 'website');
      for (const preview of websiteMedia.filter(record => record.post_id === item.id).flatMap(record => record.images ?? [])) {
        const url = https(preview.source_url);
        edge(objectId, 'has_example', node('media', url, { url, kind: ['video', 'video_frame_at_1s'].includes(preview.kind) ? 'video' : 'image', ...(preview.poster ? { poster: https(preview.poster) } : {}), ...(Number.isInteger(preview.width) && preview.width > 0 ? { width: preview.width } : {}), ...(Number.isInteger(preview.height) && preview.height > 0 ? { height: preview.height } : {}), sourceKind: preview.kind, alt: title, rightsStatus: 'review_required' }));
      }
      term(objectId, 'use-case', item.use_case_label, 'used_for', item.use_case ? `website-${item.use_case}` : undefined);
      if (item.model_evidence === 'author_explicit' && item.model_group && !/unknown|unconfirmed|other/iu.test(item.model_group)) {
        for (const model of item.model_group.split(' + ')) term(objectId, 'model', model, 'designed_for');
      }
      for (const tool of item.tech_stack ?? []) term(objectId, 'tool', tool, 'built_with');
      for (const [field, relation] of [['demo_url', 'has_demo'], ['source_url', 'has_code']]) {
        if (item[field]) {
          try { const url = https(item[field]); edge(objectId, relation, node('source', `url:${url}`, { url, platform: 'url' })); }
          catch { reasons.push(`unsafe_${field}`); }
        }
      }
      for (const related of [...(item.related_posts ?? []), ...(item.project_posts ?? [])]) {
        const relatedUrl = related.url ?? related.post_url;
        if (relatedUrl) { const ref = source(relatedUrl); edge(objectId, 'related_to', node('source', ref.key, { url: ref.url, platform: ref.platform, sourceId: ref.sourceId })); }
      }
    } else {
      term(objectId, 'model', 'GPT Image 2', 'designed_for');
      term(objectId, 'use-case', item.category, 'used_for');
      for (const style of item.styles ?? []) term(objectId, 'style', style, 'has_style');
      for (const scene of item.scenes ?? []) term(objectId, 'subject', scene, 'has_subject');
      if (!/^\/images\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif)$/u.test(item.image)) throw new Error('Invalid gallery image path');
      const mediaUrl = `https://raw.githubusercontent.com/freestylefly/awesome-gpt-image-2/${upstreamCommit}/data${item.image}`;
      edge(objectId, 'has_example', node('media', mediaUrl, { url: mediaUrl, alt: item.imageAlt || title, rightsStatus: 'review_required', repositoryLicense: 'MIT; third-party source rights require review' }));
      if (item.githubUrl) edge(objectId, 'documented_at', node('source', https(item.githubUrl), { url: https(item.githubUrl), platform: 'url' }));
    }
    reviews.push({ namespace, sourceKey: String(item.id), objectId, reasons });
  }
  const result = {
    schemaVersion: 1, observedAt, upstreamCommit,
    nodes: [...nodes.values()].sort((a,b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()].sort((a,b) => `${a.from}:${a.type}:${a.to}`.localeCompare(`${b.from}:${b.type}:${b.to}`)),
    proposals: [...proposals.values()].sort((a,b) => a.body.prompt.artifactKey.localeCompare(b.body.prompt.artifactKey)),
    reviews,
    manifest: { websitesProcessed: websites.length, imagesProcessed: gallery.cases.length, duplicates, conflicts, categoryMappings: [...new Set(gallery.cases.map(c => c.category))].sort().map(label => ({ source: label, axis: 'use-case', slug: slug(label) })), state: 'proposal_ready', cmsAccepted: 0, public: 0, mirrorSynced: false, deployed: false },
  };
  validateGraph(result);
  return result;
}

export function validateGraph({ nodes, edges }) {
  const ids = new Set();
  for (const node of nodes) { if (ids.has(node.id)) throw new Error('duplicate node'); ids.add(node.id); }
  const relations = new Set();
  for (const edge of edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) throw new Error('missing graph endpoint');
    const key = `${edge.from}:${edge.type}:${edge.to}`;
    if (relations.has(key)) throw new Error('duplicate edge');
    relations.add(key);
  }
}

/** Verify the actual stored batch, including its CMS contract and non-public state. */
export function checkIntake({ graph, proposals, reviews, manifest }) {
  validateGraph(graph);
  const same = (a, b) => { if (a !== b) throw new Error('intake count mismatch'); };
  same(manifest.nodes, graph.nodes.length);
  same(manifest.edges, graph.edges.length);
  same(manifest.proposals, proposals.length);
  same(manifest.websitesProcessed, reviews.filter(r => r.namespace === 'websites').length);
  same(manifest.imagesProcessed, reviews.filter(r => r.namespace === 'gpt-image-2').length);
  const byId = new Map(graph.nodes.map(n => [n.id, n]));
  const ids = new Set();
  for (const proposal of proposals) {
    normalizePromptProposal(proposal.body);
    const key = proposal.body.prompt.artifactKey;
    if (ids.has(key)) throw new Error('duplicate proposal');
    ids.add(key);
    const node = byId.get(key);
    if (!node || node.type !== 'prompt' || node.prompt !== proposal.body.prompt.text) throw new Error('graph/proposal prompt text mismatch');
  }
  for (const review of reviews) {
    if (!byId.has(review.objectId)) throw new Error('review graph endpoint missing');
    if (!review.reasons.includes('rights_review') || !review.reasons.includes('editorial_review')) throw new Error('missing review requirement');
  }
  if (manifest.public !== 0 || manifest.cmsAccepted !== 0 || manifest.mirrorSynced !== false || manifest.deployed !== false) throw new Error('unverified intake publication claim');
  for (const node of graph.nodes.filter(n => n.type === 'prompt' || n.type === 'website-case')) {
    if (node.state !== 'draft' || node.rightsStatus !== 'review_required' || node.robots !== 'noindex,nofollow') throw new Error('unverified node publication claim');
    if (!graph.edges.some(e => e.from === node.id && e.type === 'sourced_from')) throw new Error('object has no source edge');
  }
}
