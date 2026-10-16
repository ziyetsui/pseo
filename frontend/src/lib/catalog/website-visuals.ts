import type {Catalog,Media} from './types';
import {websiteEntries} from './website';

type VisualAsset = Media & {sha256:string;posterSha256:string|null;sourceUrl:string;visualSourceUrl:string;origin:'x-media'|'demo-screenshot';part:number|null;parts:number|null};
type VisualRow = {id:string;sourceUrl:string;status:string;visualSourceUrl:string|null;media:string[]};
export interface WebsiteVisualManifest {version:1;observedAt:string;records:VisualRow[];assets:Record<string,VisualAsset>}
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Website visual object required');return value as Record<string,unknown>;}
function text(value:unknown):string{if(typeof value!=='string'||!value.trim())throw Error('Website visual text required');return value;}
const hash=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const post=(value:unknown)=>typeof value==='string'&&/^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/status\/\d+$/.test(value);
export function readWebsiteVisualManifest(input:unknown):WebsiteVisualManifest{
 const value=object(input);if(value.version!==1||!Number.isFinite(Date.parse(text(value.observedAt)))||!Array.isArray(value.records))throw Error('Website visual contract required');
 const assets:Record<string,VisualAsset>={};
 for(const [id,raw] of Object.entries(object(value.assets))){
  const a=object(raw),kind=a.kind,src=text(a.src),poster=a.poster===null?null:text(a.poster);
  if(!/^\d+$/.test(id)||!['image','video'].includes(String(kind))||!hash(a.sha256)||!post(a.visualSourceUrl)||typeof a.width!=='number'||a.width<=0||typeof a.height!=='number'||a.height<=0)throw Error('Invalid website visual asset');
  if(kind==='image'&&!new RegExp(`^/website-previews/${id}\\.(?:jpg|png|webp)$`).test(src)||kind==='video'&&(src!==`/website-videos/${id}.mp4`||!poster||poster!==`/website-previews/${id}.jpg`||!hash(a.posterSha256)))throw Error('Invalid local website visual');
  if(!(a.part===null&&a.parts===null)&&!(Number.isInteger(a.part)&&Number.isInteger(a.parts)&&Number(a.part)>0&&Number(a.part)<=Number(a.parts)))throw Error('Invalid website video sequence');
  const origin=text(a.origin);if(!['x-media','demo-screenshot'].includes(origin)||origin==='demo-screenshot'&&kind!=='image')throw Error('Invalid website visual origin');
  const sourceUrl=text(a.sourceUrl),url=new URL(sourceUrl);if(url.protocol!=='https:'||url.username||url.password||origin==='x-media'&&!['pbs.twimg.com','video.twimg.com'].includes(url.hostname))throw Error('Invalid original visual URL');
  assets[id]={id,kind:kind as 'image'|'video',src,poster,alt:text(a.alt),width:a.width,height:a.height,label:null,sha256:text(a.sha256),posterSha256:poster?text(a.posterSha256):null,sourceUrl,visualSourceUrl:text(a.visualSourceUrl),origin:origin as 'x-media'|'demo-screenshot',part:a.part as number|null,parts:a.parts as number|null};
 }
 const ids=new Set<string>();
 const records=value.records.map((raw):VisualRow=>{const r=object(raw),id=text(r.id),sourceUrl=text(r.sourceUrl),status=text(r.status);if(ids.has(id)||!post(sourceUrl)||!['available','existing','no-source-media','source-unavailable'].includes(status)||!Array.isArray(r.media))throw Error('Invalid website visual record');ids.add(id);const media=r.media.map(text);if(new Set(media).size!==media.length||media.some(key=>!assets[key]))throw Error('Missing website visual asset');const visualSourceUrl=r.visualSourceUrl===null?null:text(r.visualSourceUrl);if(visualSourceUrl&&!post(visualSourceUrl)||status==='available'&&(!media.length||!visualSourceUrl)||status!=='available'&&media.length)throw Error('Conflicting website visual status');if(media.some(key=>assets[key]!.visualSourceUrl!==visualSourceUrl))throw Error('Website visual source mismatch');
 const sequences=new Map<string,VisualAsset[]>();
 for(const key of media){const a=assets[key]!;if(a.part!==null)sequences.set(a.sourceUrl,[...(sequences.get(a.sourceUrl)??[]),a]);}
 for(const sequence of sequences.values())if(sequence.length!==sequence[0]!.parts||sequence.some((asset,index)=>asset.part!==index+1||asset.parts!==sequence.length))throw Error('Incomplete website video sequence');
 return {id,sourceUrl,status,visualSourceUrl,media};});
 return {version:1,observedAt:text(value.observedAt),records,assets};
}
export function applyWebsiteVisuals(catalog:Catalog,manifest:WebsiteVisualManifest):Catalog{
 const entries=new Map(websiteEntries(catalog).map(entry=>[entry.id,entry]));
 if(entries.size!==manifest.records.length)throw Error('Website visual coverage mismatch');
 const mapped=new Map<string,{cover:string;media:Media[];visualSourceUrl:string|null;demoSources:string[]}>();
 for(const row of manifest.records){const entry=entries.get(row.id);if(!entry||entry.source.url!==row.sourceUrl)throw Error('Stale website visual binding');const media=row.media.map(id=>{const a=manifest.assets[id]!;return {id:a.id,kind:a.kind,src:a.src,poster:a.poster,alt:entry.title,width:a.width,height:a.height,label:a.part===null?null:catalog.locale==='zh-CN'?`第 ${a.part} / ${a.parts} 段`:`Part ${a.part} of ${a.parts}`};});mapped.set(row.id,{cover:entry.cover||media.find(m=>m.kind==='image')?.src||media.find(m=>m.poster)?.poster||'',media,visualSourceUrl:row.visualSourceUrl,demoSources:row.media.map(id=>manifest.assets[id]!).filter(a=>a.origin==='demo-screenshot').map(a=>a.sourceUrl)});}
 return {...catalog,prompts:catalog.prompts.map(prompt=>{const visual=mapped.get(prompt.id);if(!visual?.media.length)return prompt;return {...prompt,img:visual.cover,media:visual.media,evidence:[...prompt.evidence,...visual.demoSources.map(url=>({type:catalog.locale==='zh-CN'?'相关来源':'Related source',url,confidence:null})),...(visual.visualSourceUrl&&visual.visualSourceUrl!==prompt.source.url?[{type:catalog.locale==='zh-CN'?'相关来源':'Related source',url:visual.visualSourceUrl,confidence:null}]:[])]};}),websites:catalog.websites?.map(entry=>{const visual=mapped.get(entry.id)!;return {...entry,cover:visual.cover,media:visual.media.length?visual.media:entry.media,relatedSources:[...new Set([...entry.relatedSources,...visual.demoSources,...(visual.visualSourceUrl&&visual.visualSourceUrl!==entry.source.url?[visual.visualSourceUrl]:[])])]};})};
}
