(() => {
  'use strict';
  const E=window.PseoWireframe, $=s=>document.querySelector(s);
  const titles=['定义目标','用户任务','样本与来源','对象与关系','页面计划','模板与生成','走查与交接'];
  const draftKey='pseo-wireframe-v1';
  let step=0, result=null;
  let p={version:1,name:'',kind:'catalog',audience:'',goal:'discover',task:'',action:'read',sampleMode:'illustrative',categoryLabel:'类型',collectionLabel:'用途',density:'comfortable',records:[]};
  let recordsText='[]';
  const form=$('#step-form'), panel=$('#fields'), status=$('#status');
  const opts=(k)=>Object.entries(E.choices[k]).map(([value,label])=>`<option value="${value}" ${p[k]===value?'selected':''}>${E.esc(label)}</option>`).join('');
  const input=(key,title,placeholder='')=>`<label for="${key}">${title}</label><input id="${key}" name="${key}" value="${E.esc(p[key])}" placeholder="${E.esc(placeholder)}" required maxlength="500">`;
  const select=(key,title)=>`<label for="${key}">${title}</label><select id="${key}" name="${key}">${opts(key)}</select>`;
  function save(){ try{localStorage.setItem(draftKey,JSON.stringify({p,recordsText,step}));}catch{status.textContent='浏览器未允许保存草稿。请导出输入文件后保存。';} }
  function sync(){new FormData(form).forEach((v,k)=>{if(k==='recordsText')recordsText=v;else p[k]=v;});save();}
  function invalidate(){if(result){result=null;$('#output').hidden=true;$('#preview').removeAttribute('srcdoc');$('#downloads').replaceChildren();} }
  function candidate(){const raw={...p,records:JSON.parse(recordsText)};return E.validate(raw);}
  function checkStep(){
    if(!form.reportValidity())return false;
    sync();
    if(step===2){let rows;try{rows=JSON.parse(recordsText);}catch{throw Error('样本 JSON 格式不正确，请检查逗号和引号。');}E.validate({...p,name:p.name||'待命名',audience:p.audience||'待读者',task:p.task||'待任务',records:rows});p.records=rows;}
    if(step>=4)candidate();
    return true;
  }
  function show(){
    $('#steps').innerHTML=titles.map((t,i)=>`<li class="${i===step?'active':''}" ${i===step?'aria-current="step"':''}>${i+1}. ${t}</li>`).join('');
    $('#step-title').textContent=`${String(step+1).padStart(2,'0')} / ${titles[step]}`;
    status.textContent='';
    if(step===0)panel.innerHTML=`<p class="muted">从一个有明确读者和任务的小范围开始。你可以随时返回修改。</p>${input('name','网站 / 项目名称','例如：独立创作者资源库')}${select('kind','准备整理什么')}${input('audience','主要读者','例如：刚开始做播客的独立创作者')}${select('goal','网站首先帮助用户做什么')}`;
    if(step===1)panel.innerHTML=`<p class="muted">描述使用者想完成的事情。后面的页面和行动围绕这句话组织。</p>${input('task','用户来到这里，要完成什么','例如：找到适合小房间录音的入门方案')}${select('action','详情页的主要行动')}<p class="notice">来源行动需要记录中的真实链接；缺少链接的按钮将不可用。此向导不会自动查询市场需求。</p>`;
    if(step===2)panel.innerHTML=`<p>先用一小批记录试通页面。没有资料时，结构示例能帮助你检查布局。</p><label for="sampleMode">样本状态</label><select id="sampleMode" name="sampleMode"><option value="illustrative" ${p.sampleMode==='illustrative'?'selected':''}>结构示例（不代表事实）</option><option value="provided" ${p.sampleMode==='provided'?'selected':''}>我提供的真实样本（待核对）</option></select><label for="recordsText">记录 JSON（最多 100 条）</label><textarea id="recordsText" name="recordsText" spellcheck="false" rows="12">${E.esc(recordsText)}</textarea><p class="muted">每条需包含 id、title、category、collection、summary、body；source 为可选 http/https 来源。空数组只适用于结构示例模式。</p><details><summary>查看一条记录的格式</summary><pre style="white-space:pre-wrap">${E.esc(JSON.stringify({id:'sample-1',title:'你的资料名称',category:'一级分组',collection:'二级分组',summary:'一句话说明',body:'完整资料或操作步骤',source:''},null,2))}</pre></details>`;
    if(step===3)panel.innerHTML=`<p>记录中的 category 和 collection 决定归属；这里定义展示名称。同一对象只保存一次。</p>${input('categoryLabel','第一层分类叫什么','例如：主题 / 资源类型')}${input('collectionLabel','第二层集合叫什么','例如：用途 / 场景')}<p class="notice">只从有记录的分组生成页面。不会把所有标签任意组合成大量页面。</p>`;
    if(step===4){const m=E.model(candidate());panel.innerHTML=`<p>从你的数据得到 <strong>${m.pages.length} 个页面视图</strong>：首页 → ${E.esc(p.categoryLabel)} → ${E.esc(p.collectionLabel)} → 详情。</p><div class="table-wrap"><table><thead><tr><th>层级</th><th>标题</th><th>样本数</th></tr></thead><tbody>${m.pages.map(r=>`<tr><td>L${r.level}</td><td>${E.esc(r.title)}</td><td>${r.count}</td></tr>`).join('')}</tbody></table></div><p class="notice">这些是原型视图。进入正式网站前，还需判断每页是否回答独立任务、是否有足够信息，以及是否与已有页面重复。</p>`;}
    if(step===5)panel.innerHTML=`<p>原型使用低保真线框样式，把评审重点放在内容与路径上。</p>${select('density','阅读密度')}<ul><li>首页：任务说明、分类与搜索</li><li>分类页：集合入口与当前范围</li><li>集合页：分组关系与候选内容</li><li>详情页：完整正文、行动、来源与相关内容</li></ul><p class="muted">下一步会在本机生成预览和可下载文件。没有联网请求。</p>`;
    if(step===6){panel.innerHTML='<p>已生成下面的可交互原型。请先试走一条完整路径，再导出给同事或 Agent 继续处理。</p><ul><li>从首页进入分类、集合和详情。</li><li>搜索一个存在的词，再搜索不存在的词并清除。</li><li>检查正文、行动和缺少来源时的状态。</li><li>在窄屏里检查导航与阅读。</li></ul><p class="notice">生成完成；浏览器走查和内容审核需要真实执行后记录。输入文件可以导回此向导继续修改。</p>';if(result)mountResult();}
    $('#back').disabled=step===0;$('#next').textContent=step===5?'生成完整原型':step===6?'返回修改':'保存并继续';
    $('#step-title').focus();save();
  }
  function download(name,body,type){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([body],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
  function mountResult(){
    $('#output').hidden=false;$('#preview').srcdoc=result['index.html'];
    $('#downloads').replaceChildren();
    for(const [name,body] of Object.entries(result)){const b=document.createElement('button');b.type='button';b.textContent=name==='index.html'?'下载独立原型 HTML':name==='project.json'?'保存可续接输入 JSON':name;b.addEventListener('click',()=>download(name,body,name.endsWith('.html')?'text/html;charset=utf-8':'text/plain;charset=utf-8'));$('#downloads').append(b);}
  }
  form.addEventListener('input',()=>{sync();invalidate();});
  form.addEventListener('submit',e=>{e.preventDefault();try{if(!checkStep())return;if(step===6){step=0;show();return;}if(step===5){p=candidate();result=E.artifacts(p);}step++;show();}catch(err){status.textContent=err.message;}});
  $('#back').addEventListener('click',()=>{sync();step=Math.max(0,step-1);show();});
  $('#export').addEventListener('click',()=>{try{sync();const raw=candidate();download('project.json',JSON.stringify(raw,null,2),'application/json');}catch(err){status.textContent='请先补齐输入再导出：'+err.message;}});
  $('#import').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2500000)throw Error('输入文件太大，限 2.5 MB');const raw=E.validate(JSON.parse(await file.text()));p=raw;recordsText=JSON.stringify(p.records,null,2);invalidate();step=0;show();status.textContent='已导入输入，可继续修改。';}catch(err){status.textContent='导入失败：'+err.message;}finally{e.target.value='';}});
  $('#example').addEventListener('click',()=>{sync();download('current-draft.json',JSON.stringify({p,recordsText,step},null,2),'application/json');p={version:1,name:'播客制作手册 · 结构示例',kind:'knowledge',audience:'准备发布第一期播客的创作者',goal:'learn',task:'从准备、录音到发布，找到当前步骤的操作说明',action:'copy',sampleMode:'illustrative',categoryLabel:'阶段',collectionLabel:'任务',density:'comfortable',records:[{id:'prep-1',title:'录音前检查 · 示例',category:'准备',collection:'设备与环境',summary:'示例结构：检查一次录音会话的输入。',body:'以下是结构示例，需用你的实际方法替换。\n1. 写出使用场景。\n2. 填写检查项目。\n3. 记录通过与失败条件。',source:''},{id:'prep-2',title:'测试录音 · 示例',category:'准备',collection:'设备与环境',summary:'示例结构：记录测试结果。',body:'以下是结构示例。\n填写实际测试方法、样本与验收标准。',source:''},{id:'publish-1',title:'发布核对 · 示例',category:'发布',collection:'交付检查',summary:'示例结构：核对最终文件与说明。',body:'以下是结构示例。\n填写发布前需要核对的真实事项。',source:''}]};recordsText=JSON.stringify(p.records,null,2);invalidate();step=0;show();status.textContent='已载入明确标注的结构示例；之前的草稿已下载备份。';});
  $('#restore').addEventListener('click',()=>{try{const saved=JSON.parse(localStorage.getItem(draftKey));if(!saved)throw Error('没有保存的草稿');if(!saved.p||typeof saved.recordsText!=='string')throw Error('草稿格式无效');p={...p,...saved.p};recordsText=saved.recordsText;step=0;invalidate();show();status.textContent='已恢复草稿。';}catch(err){status.textContent=err.message;}});
  // Capture prior session before initial rendering writes a new draft.
  let initial=null;try{initial=JSON.parse(localStorage.getItem(draftKey));}catch{}
  if(initial&&initial.p&&typeof initial.recordsText==='string'){p={...p,...initial.p};recordsText=initial.recordsText;}
  show();
})();
