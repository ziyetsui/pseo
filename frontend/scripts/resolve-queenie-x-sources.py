from pathlib import Path
from html.parser import HTMLParser
from concurrent.futures import ThreadPoolExecutor,as_completed
import json,re,subprocess,hashlib,datetime
import argparse
parser=argparse.ArgumentParser(description='Resolve explicit original-post links, excluding recommendation links.')
parser.add_argument('--dataset',type=Path,default=Path('frontend/src/data/queenie-images.json'))
parser.add_argument('--cache',type=Path,default=Path('/tmp/ancher-youmind-sources'))
parser.add_argument('--output',type=Path,default=Path('/tmp/ancher-youmind-attribution-results.json'))
args=parser.parse_args()
CACHE=args.cache;CACHE.mkdir(parents=True,exist_ok=True)
rows=[r for r in json.loads(args.dataset.read_text())['records'] if __import__('urllib.parse',fromlist=['urlsplit']).urlsplit(r['sourceUrl']).hostname=='youmind.com']
class Page(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.author=None
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='a' and d.get('aria-label') in ['查看原文','Read original','View original']:self.links.append(d.get('href',''))
  if t=='meta' and d.get('property')=='article:author':self.author=d.get('content')

def resolve(row):
 name=hashlib.sha256(row['sourceUrl'].encode()).hexdigest();p=CACHE/(name+'.html')
 try:
  if not p.exists():
   proc=subprocess.run(['curl','-L','--retry','1','--max-time','35','-sS','-w','%{http_code}',row['sourceUrl'],'-o',str(p)],capture_output=True,text=True)
   if proc.returncode or proc.stdout!='200':
    p.unlink(missing_ok=True)
    return {'id':row['id'],'status':'fetch_failed','http':proc.stdout,'sourcePage':row['sourceUrl']}
  b=p.read_bytes();page=Page();page.feed(b.decode());links=sorted(set(page.links))
  if len(links)!=1:return {'id':row['id'],'status':'ambiguous_original','links':links,'sourcePage':row['sourceUrl']}
  m=re.fullmatch(r'https://(?:www\.)?(?:x|twitter)\.com/([A-Za-z0-9_]{1,15})/status/(\d+)(?:\?.*)?',links[0])
  if not m:return {'id':row['id'],'status':'unsupported_original','links':links,'sourcePage':row['sourceUrl']}
  return {'id':row['id'],'status':'verified','author':'@'+m[1],'sourceUrl':f'https://x.com/{m[1]}/status/{m[2]}','sourcePage':row['sourceUrl'],'sourceAuthor':page.author,'evidenceSha256':hashlib.sha256(b).hexdigest()}
 except Exception as e:return {'id':row['id'],'status':'error','reason':type(e).__name__,'sourcePage':row['sourceUrl']}
result=[]
with ThreadPoolExecutor(max_workers=6) as ex:
 for future in as_completed([ex.submit(resolve,row) for row in rows]):
  result.append(future.result())
  if len(result)%50==0:print('processed',len(result),'/',len(rows),'verified',sum(r['status']=='verified' for r in result),flush=True)
result.sort(key=lambda r:r['id']);args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
from collections import Counter
print('FINAL',dict(Counter(r['status'] for r in result)),flush=True)
