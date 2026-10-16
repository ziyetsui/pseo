/** Offline candidate extraction only. Published views read explicit, versioned edges. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export function positiveText(value=''){
 return value.split(/["\x27]?negative[_\s-]*prompt["\x27]?\s*[:：]|负面提示词\s*[:：]|禁止项\s*[:：]/iu)[0]
  .split(/\n|(?<=[.!?。])\s+/u).filter(line=>!/^\s*(?:[-*]\s*)?(?:do not|don't|avoid|no\s|不要|禁止|避免)/iu.test(line))
  .map(line=>line.split(/\b(?:avoid|do not|don't)\b|不要|禁止|避免/iu)[0]).join('\n');
}
const rules=[
 ['womenswear-selling',/(?:womenswear|female model|women.?s (?:dress|fashion)|女装|连衣裙|泳装)/iu,/(?:catalog|e.?commerce|advert|commercial fashion|price|shop|电商|广告|商品|带货|服装展示)/iu,'direct'],
 ['virtual-try-on',/(?:change (?:her|the) outfit|outfit swap|replace.*(?:clothes|outfit)|换装|试穿)/iu,null,'adaptable'],
 ['beauty-recommendations',/(?:lipstick|skincare|perfume|cosmetic|beauty product|口红|护肤|香水|美妆产品)/iu,/(?:product|advert|brand|recommend|产品|广告|推荐|品牌)/iu,'adaptable'],
 ['product-hero-images',/(?:product (?:photography|shot|image|display)|e.?commerce|商品展示|商品主图|产品展示)/iu,null,'direct'],
 ['product-detail-images',/(?:product.*(?:specification|exploded|features|comparison)|technical.*(?:watch|phone|product)|商品详情|产品.*(?:卖点|拆解|参数|图鉴))/iu,null,'direct'],
 ['ecommerce-advertising',/(?:product|perfume|drink|soda|sneaker|coffee machine|商品|香水|饮料|汽水|产品|奶茶)/iu,/(?:advert|campaign|poster|marketing|广告|海报|宣传)/iu,'direct'],
 ['brand-campaigns',/(?:brand|campaign|品牌|联名)/iu,/(?:poster|advert|visual|海报|广告|视觉)/iu,'direct'],
 ['promotional-campaigns',/(?:sale\b|discount|limited.offer|promotion|促销|折扣|优惠|活动价)/iu,/(?:poster|advert|graphic|banner|海报|广告|宣传图)/iu,'direct'],
 ['product-launches',/(?:product launch|launch (?:poster|campaign|board)|产品发布|新品发布|发布板)/iu,null,'direct'],
 ['product-ad-videos',/(?:product|brand|商品|产品|品牌)/iu,/(?:advert|campaign|广告|宣传)/iu,'direct','video'],
 ['xiaohongshu-shopping',/(?:xiaohongshu|小红书)/iu,/(?:product|brand|shopping|recommend|商品|品牌|种草|带货)/iu,'adaptable'],
 ['wechat-covers',/(?:wechat.*cover|公众号.*封面|公众号封面)/iu,null,'direct'],
 ['short-video-covers',/(?:video thumbnail|youtube thumbnail|short.video cover|视频封面|短视频封面)/iu,null,'direct'],
 ['relationship-comics',/(?:comic|panels|漫画|分镜)/iu,/(?:couple|romance|relationship|love|healing|leaning together|情侣|恋爱|情感|治愈|爱情)/iu,'adaptable'],
 ['educational-posts',/(?:infographic|educational|learning card|science.*(?:diagram|poster)|信息图|科普|学习卡|知识图谱)/iu,null,'adaptable'],
 ['restaurant-marketing',/(?:restaurant|menu|餐厅|菜单)/iu,/(?:design|poster|advert|website|layout|设计|海报|广告|网站|宣传)/iu,'direct'],
 ['cafe-bakery-marketing',/(?:cafe|coffee|bakery|咖啡|烘焙)/iu,/(?:brand|advert|menu|website|landing|poster|品牌|广告|菜单|网站|海报)/iu,'adaptable'],
 ['beauty-services',/(?:hairstyle|haircut|hair salon|personal colo[u]?r|发型|理发|个人色彩|美学分析)/iu,/(?:analysis|chart|style|report|分析|图鉴|档案|报告)/iu,'adaptable'],
 ['fitness-enrollment',/(?:fitness|gym|workout|健身|训练)/iu,/(?:poster|campaign|advert|infographic|海报|广告|信息图)/iu,'adaptable'],
 ['travel-marketing',/(?:travel|tourism|city map|旅行|旅游|城市.*地图|美食地图)/iu,/(?:poster|map|postcard|website|海报|地图|明信片|网站)/iu,'adaptable'],
 ['logo-design',/(?:logo design|brand logo|create.*logo|标志设计|品牌.*logo|设计.*标志)/iu,null,'direct'],
 ['brand-identity',/(?:brand identity|visual identity|branding system|品牌视觉|视觉识别|品牌身份)/iu,null,'direct'],
 ['packaging-design',/(?:packaging|package design|产品包装|包装设计)/iu,null,'direct'],
 ['commercial-brochures',/(?:brochure|brand booklet|commercial catalog|宣传画册|商用画册)/iu,null,'direct'],
 ['commercial-illustration',/(?:illustration|插画)/iu,null,'adaptable'],
 ['ecommerce-websites',/(?:e.?commerce|online (?:store|shop)|storefront|shopify|cart|checkout|电商|商城|商店|购物车)/iu,/(?:website|webpage|landing|网站|网页|首页)/iu,'direct','website'],
 ['brand-websites',/(?:brand|company|business|品牌|企业|公司)/iu,/(?:website|webpage|网站|官网)/iu,'direct','website'],
 ['sales-landing-pages',/(?:landing page|sales page|落地页|销售页)/iu,null,'direct','website'],
 ['portfolio-websites',/(?:portfolio|作品集)/iu,/(?:website|webpage|page|网站|网页|页面)/iu,'direct','website'],
 ['interactive-product-showcases',/(?:product|configurator|产品|配置器)/iu,/(?:interactive|3d|scroll|交互|三维|滚动)/iu,'direct','website'],
 ['course-sales',/(?:course|课程)/iu,/(?:sales|sell|landing|enroll|销售|招生|报名|落地页)/iu,'direct','website'],
 ['learning-cards',/(?:learning card|flashcard|vocabulary card|学习卡|识字卡|词汇.*卡)/iu,null,'direct'],
 ['explainers',/(?:infographic|diagram|visual explainer|信息图|图解|图谱)/iu,null,'direct'],
 ['digital-publications',/(?:magazine|book cover|booklet|publication|editorial|杂志|书籍封面|刊物|画册)/iu,null,'adaptable'],
 ['lead-magnets',/(?:lead magnet|email capture|download.*(?:guide|pdf)|引流资料|领取页|邮件.*表单)/iu,null,'direct','website'],
 ['avatar-portraits',/(?:portrait|avatar|headshot|人像|肖像|头像|写真)/iu,null,'adaptable'],
 ['couple-keepsakes',/(?:couple|情侣|结婚|婚礼|wedding)/iu,/(?:portrait|illustration|photo|人像|插画|照片)/iu,'adaptable'],
 ['pet-portraits',/(?:pet portrait|宠物.*(?:画像|肖像)|(?:dog|cat).*(?:portrait|illustration)|(?:小狗|猫咪).*(?:肖像|插画))/iu,null,'adaptable'],
 ['greeting-cards',/(?:greeting card|holiday card|christmas.*(?:card|poster)|节日贺卡|圣诞.*(?:卡片|海报))/iu,null,'adaptable'],
 ['art-prints',/(?:art poster|travel poster|illustration|wall art|插画|旅行海报|装饰画)/iu,null,'adaptable'],
];
export function classifyRecord(row){
 const body=positiveText(row.prompt??row.summary??'');
 // The opening instruction establishes the subject; later implementation options do not redefine it.
 const goal=body.slice(0,2400);const website=row.href?.includes('/website/')||row.kind==='other'||row.useCases?.some(t=>/website|web-design|web-development/.test(t.slug));
 const result=[];
 for(const [slug,a,b,fit,kind] of rules){
  if(kind==='video'&&row.kind!=='video'||kind==='website'&&!website)continue;
  const uiMockup=/(?:interface mockup|ui_layout|screenshot|界面截图|直播.{0,12}界面)/iu.test(goal.slice(0,900));
  if(uiMockup&&['beauty-recommendations','ecommerce-advertising','avatar-portraits','brand-campaigns'].includes(slug))continue;
  if(slug==='beauty-recommendations'&&/(?:mirror selfie|bathroom|自拍|浴室)/iu.test(goal.slice(0,400))&&!/(?:advert|campaign|广告|宣传)/iu.test(goal.slice(0,400)))continue;
  if(slug==='sales-landing-pages'&&!/(?:sales|conversion|pricing|purchase|product|course|booking|销售|转化|购买|产品|课程|预约|注册)/iu.test(goal.slice(0,700)))continue;
  if(slug==='avatar-portraits'&&!/(?:\bportrait\b|\bavatar\b|\bheadshot\b|人像|肖像|头像|写真)/iu.test(goal))continue;

  if(!a.test(goal)||b&&!b.test(goal))continue;
  if(slug==='beauty-services'&&!/(?:hairstyle analysis|hair(?:style|cut).{0,25}(?:chart|lookbook|guide)|personal colo[u]?r|面部美学分析|发型.{0,12}(?:分析|图鉴)|个人色彩)/iu.test(goal+' '+row.title))continue;
  if(slug==='pet-portraits'&&!/(?:pet portrait|宠物.{0,10}(?:画像|肖像)|\b(?:dog|cat) portrait\b|(?:小狗|猫咪).{0,8}(?:肖像|插画))/iu.test(goal))continue;
  if(slug==='product-detail-images'&&!/(?:product (?:detail|specification|features)|exploded.view|technical (?:guide|diagram)|商品详情|产品.{0,10}(?:卖点|拆解|参数|图鉴))/iu.test(goal))continue;
  if(slug==='explainers'&&!/(?:infographic|visual explainer|anatomical (?:atlas|diagram)|信息图|图解|图谱)/iu.test(goal))continue;
  if(slug==='womenswear-selling'&&/(?:supplement|hydrate|protein|营养补充剂)/iu.test(goal))continue;
  if(slug==='brand-campaigns'&&website)continue;
  if(slug==='relationship-comics'&&(!/(?:comic|manga|漫画)/iu.test(goal)||!/(?:couple|romance|relationship|leaning together|情侣|恋爱|爱情)/iu.test(goal)))continue;
  if(slug==='relationship-comics'&&(!/(?:comic|panels|漫画|分镜)/iu.test(body)||!/(?:couple|romance|relationship|love|healing|leaning together|情侣|恋爱|情感|治愈|爱情)/iu.test(body)))continue;
  const match=a.exec(goal);const start=Math.max(0,match.index-90);const quote=goal.slice(start,Math.min(goal.length,match.index+match[0].length+160));
  result.push({slug,fit,evidence:{field:'prompt',quote,reason:'Positive generation target explicitly describes this deliverable; commercial adaptation is labeled separately.'}});
 }
 const tags=row.useCases??[];
 if(tags.some(t=>t.slug==='editorial-covers'))result.push({slug:'wechat-covers',fit:'adaptable',evidence:{field:'useCases',quote:'editorial-covers',reason:'Existing article-cover classification supports an adapted editorial cover, not a native WeChat template.'}});
 return result;
}
function prepare(input,review,sampleReview){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const tax=JSON.parse(readFileSync(path.join(root,'src/data/monetization-taxonomy.json'),'utf8'));
 const prompts=new Map(input.prompts.map(p=>[p.id,p]));const byHref=new Map(input.prompts.map(p=>[p.href,p]));const aliases=new Map();const content=new Map(prompts);
 for(const w of input.websites){const p=byHref.get(w.promptHref);const key=p?.id??w.id;aliases.set(w.id,key);if(!content.has(key))content.set(key,{...w,prompt:w.summary,kind:'other',img:w.cover});}
 const sceneBySlug=new Map(tax.scenarios.map(s=>[s.slug,s]));const edges=[];const records=[];
 const manual=new Map();for(const m of review?.memberships??[]){const key=aliases.get(m.contentId)??m.contentId;const list=manual.get(key)??[];list.push(m);manual.set(key,list);}
 const judgments=new Map((sampleReview?.judgments??[]).map(j=>[(aliases.get(j.contentId)??j.contentId)+':'+j.scenarioId,j]));
 const curatedScenes=new Set(['womenswear-selling','virtual-try-on','product-hero-images','product-detail-images','promotional-campaigns','product-launches','product-ad-videos','xiaohongshu-shopping','short-video-covers','relationship-comics','restaurant-marketing','cafe-bakery-marketing','beauty-services','logo-design','brand-identity','packaging-design','commercial-brochures','ecommerce-websites','interactive-product-showcases','digital-publications','couple-keepsakes','pet-portraits','greeting-cards','art-prints']);
 const approved=new Set((sampleReview?.judgments??[]).filter(j=>['keep','change-to-adaptable','change-to-direct'].includes(j.verdict)).map(j=>(aliases.get(j.contentId)??j.contentId)+':'+j.scenarioId));
 for(const m of sampleReview?.replacementAllowlist??[]){const key=aliases.get(m.contentId)??m.contentId;approved.add(key+':'+m.scenarioId);const list=manual.get(key)??[];list.push({scenarioId:m.scenarioId,fit:m.fit,evidence:{field:m.evidence.field,excerpt:m.evidence.quote,reason:'Independent review confirmed the positive target in the complete source body.'},adaptationNotes:m.adaptationNotes});manual.set(key,list);}
 const wrongComic=new Set(['prm_009963122d9aa7088958596831061900','prm_4ad36c7c4c1ca068200e3a0a24106c7e','prm_6b3f1a9c8b7954e9c15b44814e329eb9']);
 for(const [id,row]of content){
  const found=new Map(classifyRecord(row).filter(e=>!(e.slug==='relationship-comics'&&wrongComic.has(id))).map(e=>[e.slug,e]));
  for(const m of manual.get(id)??[])found.set(m.scenarioId,{slug:m.scenarioId,fit:m.fit,evidence:{field:m.evidence.field,quote:m.evidence.excerpt,reason:m.evidence.reason},manualNotes:m.adaptationNotes});
  if(id==='prm_8629e33f89d0bd5612f59824ccc986ec'){found.delete('promotional-campaigns');if(found.has('ecommerce-advertising'))found.get('ecommerce-advertising').fit='adaptable';}
  for(const [slug,item]of found){
   const judgment=judgments.get(id+':'+slug);
   if(judgment&&['exclude','needs-review','review'].includes(judgment.verdict)){found.delete(slug);continue;}
   if(curatedScenes.has(slug)&&!approved.has(id+':'+slug)){found.delete(slug);continue;}
   if(['educational-posts','explainers','restaurant-marketing','cafe-bakery-marketing','brand-campaigns'].includes(slug)&&(row.kind==='other'||row.href?.includes('/website/'))){found.delete(slug);continue;}
   if(judgment?.verdict==='change-to-adaptable'){item.fit='adaptable';item.manualNotes=judgment.requiredNotes;}
   if(judgment?.verdict==='change-to-direct')item.fit='direct';
  }
  for(const item of found.values()){
   const scene=sceneBySlug.get(item.slug);if(!scene)throw Error('Unknown scenario '+item.slug);
   const zhNote=item.slug==='wechat-covers'?'按公众号封面尺寸调整构图、标题和留白，使用与文章一致的主题。':item.slug==='xiaohongshu-shopping'?'替换为真实商品、使用场景和真实卖点，按小红书图文版式重新排版。':item.slug==='virtual-try-on'?'提供实际服装参考并核对服装细节；此案例展示换装思路，不保证商品细节一致。':`将主体、品牌或文案替换为实际委托内容，并调整为“${scene.labels['zh-CN']}”所需的输出规格。`;
   const enNote=item.manualNotes||`Replace the subject, brand or copy for the actual brief and adapt the format for ${scene.labels.en.toLowerCase()}.`;
   edges.push({contentId:id,scenarioId:scene.id,fit:item.fit,evidence:item.evidence,notes:{en:item.fit==='adaptable'?enNote:'','zh-CN':item.fit==='adaptable'?zhNote:''},sourceRevision:input.revision});
  }
  records.push({contentId:id,status:found.size?'mapped':'unrelated',reason:found.size?'Positive deliverable evidence recorded on each relationship.':'No sufficiently specific positive target supports the current commercial scenes; no forced mapping.',scenarioIds:[...found.keys()].map(s=>sceneBySlug.get(s).id)});
 }
 const membership={version:1,revision:input.revision,edges};const audit={version:1,revision:input.revision,records};
 for(const [name,data]of [['membership',membership],['audit',audit]])writeFileSync(path.join(root,`src/data/monetization-${name}.json`),JSON.stringify(data,null,2)+'\n');
 const counts=tax.scenarios.map(s=>({slug:s.slug,label:s.labels['zh-CN'],count:edges.filter(e=>e.scenarioId===s.id).length,samples:edges.filter(e=>e.scenarioId===s.id).slice(0,5).map(e=>({id:e.contentId,title:content.get(e.contentId).title,fit:e.fit,evidence:e.evidence,notes:e.notes}))}));
 mkdirSync(path.join(root,'evidence/monetization'),{recursive:true});writeFileSync(path.join(root,'evidence/monetization/classification-audit.json'),JSON.stringify({revision:input.revision,logicalContent:content.size,mapped:records.filter(r=>r.status==='mapped').length,edges:edges.length,scenes:counts},null,2)+'\n');
 console.log(JSON.stringify({revision:input.revision,logicalContent:content.size,mapped:records.filter(r=>r.status==='mapped').length,edges:edges.length,scenes:counts.map(({slug,label,count})=>({slug,label,count}))},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const input=JSON.parse(readFileSync(process.argv[2],'utf8'));const review=process.argv[3]?JSON.parse(readFileSync(process.argv[3],'utf8')):null;const sampleReview=process.argv[4]?JSON.parse(readFileSync(process.argv[4],'utf8')):null;prepare(input,review,sampleReview);
}
