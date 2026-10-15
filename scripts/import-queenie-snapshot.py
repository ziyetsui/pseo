#!/usr/bin/env python3
"""Project an owner-authorized public Queenie snapshot; never connects to a DB or writes the source.

Input: capture-queenie-public.py output and image-verification.json from decoded media.
Output is deterministic. Public image URLs are content-addressed upstream; checksums bind the snapshot.
"""
import argparse, datetime, hashlib, json, re
from pathlib import Path

TOPICS = {'ai-tools':('AI tools','AI 工具'),'education':('Education','教育'),'business':('Business','商业'),'retro-photos':('Old photographs','老照片'),'memes':('Memes','梗图'),'self-growth':('Personal growth','个人成长'),'mystic-energy':('Mystic energy','玄学与能量'),'wellness':('Wellness','身心健康'),'career':('Career','职场'),'doodle-diary':('Doodle diary','涂鸦日记'),'food':('Food','美食'),'pets':('Pets','宠物'),'travel':('Travel','旅行'),'fashion':('Fashion','时尚'),'home':('Home','家居')}
TASKS={'wechat-cover':('editorial-covers','Editorial covers','文章封面'),'meme-template':('meme-design','Meme design','梗图创作'),'xiaohongshu-carousel':('social-carousel','Social carousels','社交图文'),'douyin-carousel':('social-carousel','Social carousels','社交图文'),'tiktok-carousel':('social-carousel','Social carousels','社交图文')}
# Source mistranslations found during the bilingual audit. Printed Japanese/Chinese image text stays intact.
EN_FIXES={'chen-lie-s-deduction-sta2av':{'layout':'A single-panel comic with a text block above a classroom desk scene and a small numbered square in the upper corner.','palette':'Pure black-and-white line art on white paper, without colour.','subject':'Two people sitting at classroom desks with books on the desks.','mood':'A bored, everyday classroom atmosphere rendered as a black-and-white comic.'},'the-day-i-gave-up-my-corporate-promotion-xhud3l':{'subject':'A front-facing seated figure in a dark suit, with a brass mechanical head made of exposed gears and gauges.'},'google-nano-banana-2-10-n7ns4h':{'layout':'A single image with a text block on the left, an anthropomorphic subject on the right and a small label below.','palette':'A warm yellow-to-orange radial gradient with dark brown lettering and white and mint-green accents.','subject':'A cartoon banana wearing glasses and giving a thumbs-up.','mood':'Light, encouraging and approachable for beginner self-study.'}}
def clean(s):return re.sub(r'\s+',' ',s).strip().replace('[','(').replace(']',')')
def brief(s,limit):
 s=clean(s);first=re.split(r'(?<=[。.!?])\s+',s)[0]
 # Preserve complete visual clauses rather than truncating mid-word.
 if len(first)<=limit:return first
 parts=re.split(r'[,;，；]',first);out=parts[0]
 for p in parts[1:]:
  if len(out+', '+p)>limit:break
  out+=', '+p
 return out

def tax(axis,slug,en,zh):return {'axis':axis,'slug':slug,'labels':{'en':en,'zh-CN':zh}}
def styles(cards):
 # Ground styles in positive visual analysis, never in the topic/title or negative instructions.
 visual=' '.join(cards[d] for d in ['layout','subject','mood']).lower()
 rules=[('anime-illustrated','Anime / illustrated','动漫与插画',r'\b(?:illustration|illustrated|anime|cartoon|comic|manga|line art|hand.drawn)\b'),('photorealistic','Photorealistic','写实风',r'\b(?:photograph|photography|photographic|photorealistic|realistic photo)\b'),('retro-vintage','Retro / vintage','复古风',r'\b(?:vintage|retro|aged photograph|old photograph|film grain)\b'),('cinematic','Cinematic','电影感',r'\b(?:cinematic|film still)\b')]
 return [tax('style',slug,en,zh) for slug,en,zh,pattern in rules if re.search(pattern,visual)]

def project(root,output):
 verified=json.loads((root/'image-verification.json').read_text());cards=json.loads((root/'cards.json').read_text());records=[];excluded=[];snapshots=[]
 for card in sorted(cards,key=lambda x:x['slug']):
  slug=card['slug'];pair={loc:json.loads((root/loc/(slug+'.json')).read_text()) for loc in ['en','zh-CN']}
  if 'original_video' in pair['en'].get('noteFlags',[]):excluded.append({'slug':slug,'reason':'Source is a video; excluded from image-only integration.'});continue
  if pair['en']['updatedAt']!=pair['zh-CN']['updatedAt']:raise ValueError('Source drift: '+slug)
  media=[verified[x['url']] for x in pair['en']['images']]
  if any('error' in x for x in media):excluded.append({'slug':slug,'reason':'One or more reference images failed verification.'});continue
  if pair['en']['contentLocale']!='en' or pair['zh-CN']['contentLocale']!='zh-CN':excluded.append({'slug':slug,'reason':'Incomplete bilingual source.'});continue
  copies={};visuals={}
  for loc,j in pair.items():
   dims={c['dimension']:c for c in j['recipe']['cards']};values={k:clean(c['value']) for k,c in dims.items()}
   if loc=='en':
    values.update(EN_FIXES.get(slug,{}));values={k:v.replace('panda图案','panda motif').replace('competitive,热血 feel','competitive, high-energy feel') for k,v in values.items()}
   if loc=='zh-CN' and slug=='the-day-i-gave-up-my-corporate-promotion-xhud3l':values['subject']='一位正面坐着的深色西装人物，头部由带有裸露齿轮和仪表的黄铜机械装置替代。'
   visuals[loc]=values
   subject=brief(values['subject'],200 if loc=='en' else 100);palette=brief(values['palette'],180 if loc=='en' else 90);headline=dims['hook']['value'].strip()
   variables=[]
   for token,dim,label in [('[SUBJECT]','subject','Subject' if loc=='en' else '主体'),('[PALETTE]','palette','Colour palette' if loc=='en' else '配色')]:
    variables.append({'token':token,'label':label,'defaultValue':subject if dim=='subject' else palette,'options':[clean(s) for s in dims[dim]['alts'] if s.strip()][:3],'note':None,'required':True})
   # Headline is independently editable; preserve the characters visible on the reference rather than translating them.
   if headline:
    variables.append({'token':'[HEADLINE]','label':'Headline' if loc=='en' else '标题文字','defaultValue':headline,'options':[],'note':'Text from the reference; change it for your own image.' if loc=='en' else '参考图中的文字，可替换为自己的标题。','required':True})
   ratio=pair['en']['images'][0];from math import gcd;g=gcd(ratio['w'],ratio['h']);aspect=f"{ratio['w']//g}:{ratio['h']//g}"
   if loc=='en':
    prompt=f"Create one original image inspired by the reference. Subject: [SUBJECT]. Composition: {values['layout']} Colour palette: [PALETTE]. Visual treatment and mood: {values['mood']}"
    if headline:prompt+=' Set the main headline to “[HEADLINE]”, preserving the supplied spelling and language. Keep the headline readable and integrated into the composition.'
    prompt+=f' Match the reference aspect ratio ({aspect}). Keep the layout coherent and avoid adding unrelated logos, watermarks or unsupported visual details.'
    summary='Image-based reconstruction with editable subject, palette'+(' and headline.' if headline else '.')
   else:
    prompt=f"参照图片的视觉结构创作一张原创图片。主体：[SUBJECT]。构图：{values['layout']} 配色：[PALETTE]。画面质感与氛围：{values['mood']}"
    if headline:prompt+=' 主标题写为“[HEADLINE]”，保留填入文字的字形、拼写和语言，文字清晰并融入构图。'
    prompt+=f' 沿用参考图比例（{aspect}），保持版式统一，不添加无关标志、水印或未经参考图支持的视觉细节。'
    summary='根据参考图整理的重建模板，可编辑主体、配色'+('与标题。' if headline else '。')
   title=j['title']
   if loc=='en':title={'google-nano-banana-2-10-n7ns4h':'Google Nano Banana 2: A Ten-Minute Beginner Guide with Prompt Examples','wx-mnttfd':'Please Write More Articles','one-sentence-makes-a-plog-gpt-is-really-good-at-it-jxlgdy':'Turn a Single Sentence into a Plog with GPT'}.get(slug,title)
   copies[loc]={'title':title,'summary':summary,'prompt':prompt,'variables':variables}
  t=TASKS[pair['en']['format']];taxonomy=[tax('useCase',*t),tax('subject','queenie-'+pair['en']['niche'],*TOPICS[pair['en']['niche']])]+styles(visuals['en'])
  row={'id':'queenie-'+slug,'slug':'queenie-'+slug,'author':pair['en']['author'],'sourceUrl':pair['en'].get('sourceUrl') or 'https://tryqueenie.com/hits/'+slug,'queenieUrl':'https://tryqueenie.com/hits/'+slug,'sourceUpdatedAt':pair['en']['updatedAt'],'media':[{k:m[k] for k in ['src','width','height','sha256']} for m in media],'taxonomy':taxonomy,'copy':copies}
  records.append(row);snapshots.append({'slug':slug,'sourceBasis':pair['en']['sourceBasis'],'originalSourceUrl':pair['en'].get('sourceUrl'),'sourceUpdatedAt':pair['en']['updatedAt'],'visualAnalysis':{loc:pair[loc]['recipe'] for loc in pair},'sourcePrompt':{loc:pair[loc].get('promptText') for loc in pair},'sourceHashes':{loc:hashlib.sha256((root/loc/(slug+'.json')).read_bytes()).hexdigest() for loc in pair}})
 observed=(root/'observed-at.txt').read_text().strip() if (root/'observed-at.txt').exists() else datetime.datetime.now(datetime.timezone.utc).isoformat()
 (root/'observed-at.txt').write_text(observed+'\n');data={'version':1,'observedAt':observed,'source':'https://tryqueenie.com','records':records,'exclusions':excluded}
 output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
 audit=output.parents[3]/'docs/intake/2026-10-15-queenie';audit.mkdir(parents=True,exist_ok=True)
 (audit/'source-analysis.json').write_text(json.dumps(snapshots,ensure_ascii=False,separators=(',',':'))+'\n')
 (audit/'manifest.json').write_text(json.dumps({'sourceRepository':'ziyetsui/queenie','sourceBranch':'launch/supplement-a','sourceCommit':'05557a4e01c0b1f6bd947d6e210d05de243fadc7','observedAt':observed,'publicRecords':len(cards),'importedRecords':len(records),'images':sum(len(r['media']) for r in records),'datasetSha256':hashlib.sha256(output.read_bytes()).hexdigest(),'analysisSha256':hashlib.sha256((audit/'source-analysis.json').read_bytes()).hexdigest(),'exclusions':excluded},ensure_ascii=False,indent=2)+'\n')
 print('projected',len(records),'records',sum(len(r['media']) for r in records),'images','excluded',len(excluded),flush=True)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--snapshot',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args();project(args.snapshot,args.output.resolve())
