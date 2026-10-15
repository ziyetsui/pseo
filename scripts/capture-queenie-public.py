import json,urllib.request,time,concurrent.futures,hashlib,httpx
CLIENT=httpx.Client(timeout=45,limits=httpx.Limits(max_connections=12,max_keepalive_connections=12),follow_redirects=True)
from pathlib import Path
import argparse
parser=argparse.ArgumentParser(description='Capture public Queenie content only; no credentials or private records.');parser.add_argument('--out',type=Path,required=True);args=parser.parse_args()
ROOT=args.out;ROOT.mkdir(parents=True,exist_ok=True)
BASE='https://tryqueenie.com/api/v1/hits'
def get(url,locale,path):
 if path.exists():return json.loads(path.read_text())
 for attempt in range(4):
  try:
   r=CLIENT.get(url,headers={'X-Locale':locale,'User-Agent':'Ancher-Queenie-owner-import/1.0'});r.raise_for_status();j=r.json()
   path.write_text(json.dumps(j,ensure_ascii=False,separators=(',',':'))+'\n');return j
  except Exception:
   if attempt==3:raise
   time.sleep(1+attempt)
first=get(BASE+'?page=1&pageSize=60','en',ROOT/'list-1.json');total=first['total'];pages=(total+59)//60
print('source total',total,'pages',pages,flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:
 lists=[first]+list(ex.map(lambda n:get(BASE+f'?page={n}&pageSize=60','en',ROOT/f'list-{n}.json'),range(2,pages+1)))
assert all(j['total']==total for j in lists),'Source total drift'
cards=[c for j in lists for c in j['items']];assert len(cards)==total and len({c['slug'] for c in cards})==total,'Source pagination drift'
(ROOT/'cards.json').write_text(json.dumps(cards,ensure_ascii=False))
count=0
jobs=[(c['slug'],loc) for c in cards for loc in ['en','zh-CN']]
def detail(job):
 slug,loc=job;d=ROOT/loc;d.mkdir(exist_ok=True)
 return get(BASE+'/'+slug,loc,d/(slug+'.json'))
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
 for j in ex.map(detail,jobs):
  count+=1
  if count%100==0:print('details',count,'/',len(jobs),flush=True)
print('capture complete',count,flush=True)
