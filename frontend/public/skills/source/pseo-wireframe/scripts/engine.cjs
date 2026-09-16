/* Shared deterministic engine: Node CLI and offline browser wizard. */
(function (root) {
  'use strict';
  const VERSION = 1;
  const choices = {
    kind: {catalog: '资源目录', knowledge: '知识库', recipe: '方法与模板库'},
    goal: {discover: '发现合适的资源', learn: '学习并完成任务', decide: '辅助选择与判断'},
    action: {read: '阅读使用说明', copy: '复制正文', source: '查看原始来源'},
    density: {comfortable: '宽松', compact: '紧凑'}
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeURL(s) { if (!s) return ''; try { const u = new URL(s); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; } }
  function validate(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('输入必须为项目 JSON 对象');
    if (raw.version !== VERSION) throw Error('不支持的 version，请使用 version: 1');
    const p = {version: VERSION};
    for (const k of ['name','audience','task','categoryLabel','collectionLabel']) {
      if (typeof raw[k] !== 'string' || !raw[k].trim() || raw[k].length > 500) throw Error(`${k} 必须是 1–500 字符的文本`);
      p[k] = raw[k].trim();
    }
    for (const k of Object.keys(choices)) { if (!Object.hasOwn(choices[k], raw[k])) throw Error(`${k} 选项无效`); p[k] = raw[k]; }
    if (!['provided','illustrative'].includes(raw.sampleMode)) throw Error('sampleMode 必须为 provided 或 illustrative');
    p.sampleMode = raw.sampleMode;
    if (!Array.isArray(raw.records) || raw.records.length > 100) throw Error('records 必须为数组，最多 100 条');
    if (p.sampleMode === 'provided' && !raw.records.length) throw Error('真实样本模式至少需要一条记录；没有数据可选择结构示例');
    const ids = new Set();
    p.records = raw.records.map((r, i) => {
      if (!r || typeof r !== 'object') throw Error(`第 ${i+1} 条记录不是对象`);
      const clean = {};
      for (const k of ['id','title','category','collection','summary','body']) {
        if (typeof r[k] !== 'string' || !r[k].trim() || r[k].length > (k === 'body' ? 20000 : 1000)) throw Error(`第 ${i+1} 条记录的 ${k} 缺失或过长`);
        clean[k] = k === 'body' ? r[k] : r[k].trim();
      }
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(clean.id) || ids.has(clean.id)) throw Error(`记录 id 必须唯一且仅含字母、数字、下划线、短横线：${clean.id}`);
      ids.add(clean.id);
      if (r.source !== undefined && typeof r.source !== 'string') throw Error(`第 ${i+1} 条记录 source 必须是 URL 文本`);
      if (r.source && !safeURL(r.source)) throw Error(`第 ${i+1} 条记录 source 只接受不含凭据的 http/https URL`);
      clean.source = safeURL(r.source);
      return clean;
    });
    return p;
  }
  function recordsFor(p) {
    if (p.records.length) return p.records;
    return ['A','B'].flatMap((group, i) => [1,2].map(n => ({
      id: `example-${i}-${n}`, title:`结构示例 ${group}${n} · 待替换`,
      category:`${p.categoryLabel} ${group}`, collection:`${p.collectionLabel} ${group}`,
      summary:'这是布局用的结构示例，不代表真实资源、效果或推荐。',
      body:'在这里放入你的真实资料。\n说明适用条件、具体步骤、结果与限制。\n补齐可核对的来源后，再检查页面能否帮助用户完成任务。', source:''
    })));
  }
  function model(raw) {
    const p = validate(raw), records = recordsFor(p);
    const categories = [...new Set(records.map(r=>r.category))].map((name,i)=>({name,id:`category-${i}`}));
    const groups = [];
    for (const c of categories) for (const name of new Set(records.filter(r=>r.category===c.name).map(r=>r.collection))) groups.push({name,category:c.name,categoryId:c.id,id:`collection-${groups.length}`});
    const enriched = records.map(r=>({...r, categoryId:categories.find(c=>c.name===r.category).id, collectionId:groups.find(g=>g.category===r.category&&g.name===r.collection).id}));
    const pages = [{id:'home',level:1,title:p.name,count:records.length}, ...categories.map(c=>({...c,level:2,title:c.name,count:records.filter(r=>r.category===c.name).length})), ...groups.map(g=>({...g,level:3,title:g.name,count:records.filter(r=>r.category===g.category&&r.collection===g.name).length})), ...enriched.map(r=>({id:`detail-${r.id}`,level:4,title:r.title,count:1}))];
    return {p,records:enriched,categories,groups,pages};
  }
  const css = `:root{color-scheme:light;--ink:#242422;--muted:#656561;--line:#deded8;--wash:#f3f3ef}*{box-sizing:border-box}body{margin:0;background:#fafaf7;color:var(--ink);font:16px/1.65 system-ui,-apple-system,sans-serif}a{color:inherit;text-underline-offset:4px}button,input,select,textarea{font:inherit}button,.button{display:inline-block;padding:10px 16px;border:1px solid var(--ink);border-radius:6px;background:white;color:var(--ink);cursor:pointer;text-decoration:none}button.primary,.primary{background:var(--ink);color:white}button:disabled{opacity:.45;cursor:default}input,select,textarea{width:100%;padding:11px;border:1px solid #aaa;background:white;color:var(--ink);border-radius:5px}textarea{min-height:150px;resize:vertical}label{display:block;font-weight:600;margin:14px 0 6px}small,.muted{color:var(--muted)}h1{font-size:clamp(28px,5vw,48px);line-height:1.2;letter-spacing:-.03em}h2{font-size:23px;line-height:1.3}h3{font-size:18px}p{max-width:75ch}header,footer{border-bottom:1px solid var(--line);padding:18px max(20px,calc((100vw - 1120px)/2))}header nav,.actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center}.brand{font-weight:750;margin-right:auto;text-decoration:none}main{max-width:1160px;margin:auto;padding:24px 20px 60px}.notice{background:var(--wash);border:1px solid var(--line);padding:12px 16px;border-radius:6px}.eyebrow{font-size:12px;letter-spacing:.1em;color:var(--muted);text-transform:uppercase}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:18px;margin:20px 0}.card{border:1px solid var(--line);background:white;border-radius:8px;padding:22px;min-width:0}.card p{margin:8px 0 18px}.compact .card{padding:14px}.compact .grid{gap:10px}.media{background:repeating-linear-gradient(135deg,#f2f2ee,#f2f2ee 10px,#e9e9e5 10px,#e9e9e5 11px);height:120px;display:grid;place-items:center;color:var(--muted);font-size:13px;margin-bottom:18px}.reading{max-width:800px}.reading pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere;background:white;border:1px solid var(--line);padding:22px;border-radius:8px}.page{scroll-margin-top:20px;margin-bottom:50px}.page[hidden],[hidden]{display:none!important}.split{display:grid;grid-template-columns:2fr 1fr;gap:28px}.path{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0 22px;font-size:14px}.searchbar{display:grid;grid-template-columns:1fr auto;gap:10px;max-width:650px;margin:20px 0}.badge{font-size:12px;border:1px solid var(--line);padding:4px 8px;border-radius:20px}a,button{overflow-wrap:anywhere}:focus-visible{outline:3px solid #476a9c;outline-offset:3px}table{width:100%;border-collapse:collapse;font-size:14px}td,th{border-bottom:1px solid var(--line);padding:10px;text-align:left;overflow-wrap:anywhere}.table-wrap{overflow-x:auto}.error{color:#a22626;white-space:pre-wrap}.stepnav{display:flex;gap:8px;flex-wrap:wrap;list-style:none;padding:0}.stepnav li{padding:5px 9px;border:1px solid var(--line);border-radius:20px;font-size:13px}.stepnav .active{background:var(--ink);color:white}.wizard{max-width:850px;margin:auto}.wizard .card{padding:28px}.status{min-height:1.6em}.preview{width:100%;height:700px;border:1px solid var(--line);border-radius:8px;background:white}footer{border-top:1px solid var(--line);border-bottom:0;font-size:13px}@media(max-width:650px){.split{grid-template-columns:1fr}.card,.wizard .card{padding:16px}.searchbar{grid-template-columns:1fr auto}header{padding:15px 20px}.preview{height:560px}h1{font-size:32px}}`;
  function runtime() {
    const pages = [...document.querySelectorAll('.page')];
    function show(next) { const id = typeof next==='string' ? next : location.hash.slice(1) || 'home'; let current=pages.find(p=>p.id===id); if (!current) current=document.getElementById('not-found'); pages.forEach(p=>p.hidden=p!==current); document.title=current.querySelector('h1').textContent+' · Wireframe'; window.scrollTo(0,0); }
    addEventListener('hashchange', show); show();
    // srcdoc inherits its parent's base URL: intercept fragment links so preview
    // navigation stays in the generated document instead of loading the wizard.
    document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
      if(location.href.startsWith('about:srcdoc')){e.preventDefault();show(a.getAttribute('href').slice(1));}
    }));
    document.querySelectorAll('[data-search]').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const page=form.closest('.page'), q=form.querySelector('input').value.trim().toLocaleLowerCase();const cards=[...page.querySelectorAll('[data-record]')];cards.forEach(c=>c.hidden=!c.textContent.toLocaleLowerCase().includes(q));const n=cards.filter(c=>!c.hidden).length;page.querySelector('[data-count]').textContent=`${n} 条结果`;page.querySelector('[data-empty]').hidden=n!==0;}));
    document.querySelectorAll('[data-reset]').forEach(b=>b.addEventListener('click',()=>{const f=b.closest('.page').querySelector('form');f.reset();f.requestSubmit();}));
    document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{const text=document.getElementById(b.dataset.copy).textContent;const status=b.parentElement.querySelector('[role=status]');try{await navigator.clipboard.writeText(text);status.textContent='已复制完整正文';}catch{const range=document.createRange();range.selectNodeContents(document.getElementById(b.dataset.copy));const s=getSelection();s.removeAllRanges();s.addRange(range);status.textContent='无法自动复制，已选中正文，请按 Ctrl/Cmd+C。';}}));
  }
  function render(raw) {
    const m=model(raw), {p,records,categories,groups}=m;
    const link=(id,title)=>`<a href="#${esc(id)}">${esc(title)}</a>`;
    const mode=p.sampleMode==='illustrative'?'结构示例 · 内容需替换':'用户提供样本 · 来源和权利尚未审核';
    const breadcrumbs=(r)=>`<nav class="path" aria-label="页面路径">${link('home','首页')} / ${link(r.categoryId,r.category)} / ${r.collectionId?link(r.collectionId,r.collection):''}</nav>`;
    const cards=rows=>`<div class="grid">${rows.map(r=>`<article class="card" data-record><div class="eyebrow">${esc(r.category)} / ${esc(r.collection)}</div>${p.kind==='catalog'?'<div class="media">封面 / 实物示意位置</div>':''}<h3>${link(`detail-${r.id}`,r.title)}</h3><p>${esc(r.summary)}</p><span class="muted">${r.source?'已提供来源链接':'来源待补'}</span><p>${link(`detail-${r.id}`,'查看详情 →')}</p></article>`).join('')}</div>`;
    const search=rows=>`<form data-search class="searchbar" role="search"><input aria-label="搜索当前列表" placeholder="搜索当前列表"><button>搜索</button></form><div class="actions"><span data-count aria-live="polite">${rows.length} 条结果</span><button type="button" data-reset>清除搜索</button></div>${cards(rows)}<p data-empty hidden class="notice">没有匹配结果。请调整关键词或清除搜索。</p>`;
    const groupCards=(arr,select)=>`<div class="grid">${arr.map(g=>`<article class="card"><span class="eyebrow">${select==='category'?esc(p.categoryLabel):esc(p.collectionLabel)}</span><h3>${link(g.id,g.name)}</h3><p>${records.filter(r=>select==='category'?r.category===g.name:r.collectionId===g.id).length} 条样本</p></article>`).join('')}</div>`;
    const home=`<section class="page" id="home"><p class="eyebrow">${esc(choices.kind[p.kind])} / 首页</p><h1>${esc(p.name)}</h1><p>为${esc(p.audience)}整理的${esc(choices.kind[p.kind])}。</p><p>${esc(p.task)}</p><p class="muted">${records.length} 条${p.sampleMode==='illustrative'?'结构示例':'输入记录'} · ${categories.length} 个${esc(p.categoryLabel)} · ${esc(choices.goal[p.goal])}</p><h2>按${esc(p.categoryLabel)}浏览</h2>${groupCards(categories,'category')}<h2>全部${esc(choices.kind[p.kind])}内容</h2>${search(records)}</section>`;
    const categoryPages=categories.map(c=>{const rows=records.filter(r=>r.category===c.name);return `<section class="page" id="${c.id}"><nav class="path">${link('home','首页')}</nav><p class="eyebrow">分类页 / ${esc(p.categoryLabel)}</p><h1>${esc(c.name)}</h1><p>从${esc(p.collectionLabel)}继续缩小范围，查看满足「${esc(p.task)}」的候选内容。</p><h2>按${esc(p.collectionLabel)}继续</h2>${groupCards(groups.filter(g=>g.category===c.name),'collection')}<h2>此分类中的内容</h2>${search(rows)}</section>`;}).join('');
    const collectionPages=groups.map(g=>`<section class="page" id="${g.id}">${breadcrumbs({categoryId:g.categoryId,category:g.category})}<p class="eyebrow">集合页 / ${esc(p.collectionLabel)}</p><h1>${esc(g.name)}</h1><p>本集合由记录中的「${esc(p.categoryLabel)} = ${esc(g.category)}、${esc(p.collectionLabel)} = ${esc(g.name)}」关系生成。</p><div class="notice">${esc(choices.goal[p.goal])}：先阅读摘要，再进入详情核对适用条件与来源。${p.goal==='decide'?'尚未提供价格、兼容性或评价字段，不能据此作出完整比较。':''}</div>${search(records.filter(r=>r.collectionId===g.id))}</section>`).join('');
    const detailPages=records.map(r=>`<section class="page" id="detail-${esc(r.id)}">${breadcrumbs(r)}<p class="eyebrow">详情页 / ${esc(choices.kind[p.kind])}</p><h1>${esc(r.title)}</h1><p>${esc(r.summary)}</p><div class="split"><div class="reading"><h2>${p.kind==='recipe'?'可复用内容与操作步骤':p.kind==='knowledge'?'核心说明与实践步骤':'资源说明与使用条件'}</h2><pre id="body-${esc(r.id)}">${esc(r.body)}</pre><div class="actions">${p.action==='copy'?`<button class="primary" data-copy="body-${esc(r.id)}">复制正文</button><span role="status"></span>`:p.action==='source'?(r.source?`<a class="button primary" href="${esc(r.source)}" target="_blank" rel="noopener noreferrer">查看原始来源 ↗</a>`:'<button disabled>来源待补</button>'):`<a class="button primary" href="#${esc(r.collectionId)}">继续阅读同组内容</a>`}</div><h2>相关内容</h2>${cards(records.filter(x=>x.collectionId===r.collectionId&&x.id!==r.id)) || ''}${records.filter(x=>x.collectionId===r.collectionId&&x.id!==r.id).length?'':'<p class="muted">当前集合暂无其他记录。</p>'}</div><aside class="card"><h2>来源与使用说明</h2><p>${r.source?`<a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer">打开提供的来源 ↗</a>`:'尚未提供来源链接。'}</p><p class="muted">${esc(mode)}。未提供的作者、日期、许可和效果证据保持缺失。</p><h3>所属关系</h3><p>${link(r.categoryId,r.category)} → ${link(r.collectionId,r.collection)}</p></aside></div></section>`).join('');
    return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(p.name)} · Wireframe</title><style>${css}</style></head><body class="${p.density}"><header><nav><a class="brand" href="#home">${esc(p.name)}</a>${categories.map(c=>link(c.id,c.name)).join(' ')}<span class="badge">本地 Wireframe</span></nav></header><main><p class="notice">${esc(mode)}。这是用于评审页面结构的原型，未发布、未验证搜索需求。</p>${home}${categoryPages}${collectionPages}${detailPages}<section class="page" id="not-found"><h1>页面不存在</h1><p>该记录或分组不在这份原型中。</p>${link('home','返回首页')}</section></main><footer>${esc(p.name)} · ${m.pages.length} 个页面视图 · ${link('home','回到首页')}</footer><script>(${runtime.toString()})();</script></body></html>`;
  }
  function artifacts(raw) {
    const m=model(raw),{p,records}=m;
    const gaps=[...(p.sampleMode==='illustrative'?['当前为结构示例，全部内容需替换为真实资料。']:[]),...records.filter(r=>!r.source).map(r=>`${r.id}：来源待补。`),'用户任务与需求强度未经访谈或搜索数据验证。','内容适用性、来源与使用权需人工核对。'];
    const state={schemaVersion:1,stages:[{step:'brief',status:'complete'},{step:'intent',status:'draft'},{step:'data',status:p.sampleMode==='provided'?'provided_unverified':'illustrative'},{step:'graph',status:'derived'},{step:'page-plan',status:'prototype_only'},{step:'wireframe',status:'generated'},{step:'review',status:'not_run'}],evidence:[],gaps};
    const plan=m.pages.map(r=>`| ${r.level} | #${r.id} | ${r.title.replace(/\|/g,'／').replace(/\n/g,' ')} | ${r.count} | 原型 / noindex |`).join('\n');
    return {
      'index.html':render(p),
      'project.json':JSON.stringify(p,null,2)+'\n',
      'progress.json':JSON.stringify(state,null,2)+'\n',
      '01-brief.md':`# ${p.name}\n\n类型：${choices.kind[p.kind]}\n\n读者：${p.audience}\n\n目标：${choices.goal[p.goal]}\n\n任务：${p.task}\n\n主要行动：${choices.action[p.action]}\n\n这些是用户输入或结构假设，并非已验证的市场结论。\n`,
      '02-intent.md':`# 用户任务\n\n当 ${p.audience} 需要「${p.task}」时，通过首页 → ${p.categoryLabel} → ${p.collectionLabel} → 详情 → ${choices.action[p.action]} 完成查找和使用。\n\n待验证：真实用户会使用哪些词？现有页面能否已经满足？哪一步信息不足会使其退出？不要凭此自动批量建立可索引 URL。\n`,
      '03-data-and-graph.json':JSON.stringify({sampleMode:p.sampleMode,records,categories:m.categories,collections:m.groups,relations:records.flatMap(r=>[{from:r.id,to:r.categoryId,type:'in_category'},{from:r.id,to:r.collectionId,type:'in_collection'}]),gaps},null,2)+'\n',
      '04-page-plan.md':`# 页面计划\n\n所有路由均为单文件原型中的锚点视图，不是生产 URL。只按实际记录关系建页，不生成分类与集合的笛卡尔积。\n\n| 层级 | 视图 | 标题 | 样本数 | 资格 |\n| --- | --- | --- | --- | --- |\n${plan}\n`,
      '05-page-contract.md':`# 页面合同\n\n- 首页：说明对象、任务、样本数，提供分类导航和搜索。\n- 分类：说明选中范围，提供集合入口和范围内搜索。\n- 集合：说明来自样本的关系，列表进入具体对象。\n- 详情：原始正文、主要行动、来源缺口、同集合关联。\n- 没有结果：保留搜索条件并提供清除。\n- 无来源：明确缺失，不虚构作者或许可；来源行动不可用。\n- 无 JavaScript：所有页面正文与锚点可读；增强搜索与自动复制需要 JS。\n- 原型不接支付、生成模型或发布接口。\n`,
      '06-review.md':`# 原型走查（尚未执行）\n\n生成不等于验收。请在真实浏览器逐项记录结果与证据。\n\n- [ ] 从首页经过分类与集合进入一条详情，返回路径正确。\n- [ ] 搜索命中 / 无结果 / 清除均可用。\n- [ ] 正文与输入相同；主要行动与失败状态可用。\n- [ ] 375px 窄屏可阅读，导航与按钮可操作。\n- [ ] 键盘焦点与无 JS 正文可访问。\n- [ ] 另一条样本与未知页面行为正确。\n\n## 内容缺口\n${gaps.map(g=>'- '+g).join('\n')}\n\n本文件未声明任何浏览器测试或发布已通过。\n`,
      '07-next-prompt.md':`# 继续工作的 Prompt\n\n使用 pseo-wireframe skill，读取本目录 project.json、progress.json 和 06-review.md。我的新输入是：【填写变化】。先沿用已确认信息，识别变动影响哪些实体、页面和行动；保留来源缺口。重新生成到新目录，再实际走查首页、分类、集合、详情与失败状态，记录证据。不要把生成完成称为需求验证或上线完成。\n\n若要进一步实施：先按宿主项目规则完成 architecture → implement → technical-seo → content-workflow → quality-gate → release；延用人工内容/权利审核，不自动部署。\n`
    };
  }
  const api={VERSION,choices,esc,safeURL,validate,model,render,artifacts,css};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PseoWireframe=api;
})(typeof globalThis!=='undefined'?globalThis:this);
