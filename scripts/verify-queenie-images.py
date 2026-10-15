import json,hashlib,httpx,concurrent.futures,time,io
from pathlib import Path
from PIL import Image
import argparse
parser=argparse.ArgumentParser();parser.add_argument('--snapshot',type=Path,required=True);parser.add_argument('--cache',type=Path,required=True);args=parser.parse_args()
ROOT=args.snapshot;CACHE=args.cache;CACHE.mkdir(parents=True,exist_ok=True)
client=httpx.Client(timeout=50,follow_redirects=True,limits=httpx.Limits(max_connections=12,max_keepalive_connections=12))
urls={m['url']:m for f in (ROOT/'en').glob('*.json') for m in json.loads(f.read_text())['images']}
print('unique images',len(urls),flush=True)
def verify(job):
 url,m=job;key=hashlib.sha256(url.encode()).hexdigest();p=CACHE/key
 for attempt in range(3):
  try:
   if p.exists():data=p.read_bytes()
   else:
    r=client.get(url);r.raise_for_status();data=r.content
    if len(data)>12*1024*1024:raise ValueError('oversize image')
    p.write_bytes(data)
   im=Image.open(io.BytesIO(data));im.verify();im=Image.open(io.BytesIO(data));im.load()
   if im.size!=(m['w'],m['h']):raise ValueError('source dimension mismatch '+str(im.size))
   return url,{'src':url,'width':im.width,'height':im.height,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'format':im.format}
  except Exception as e:
   if attempt==2:return url,{'error':str(e)}
   time.sleep(1)
results={};n=0
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
 for url,item in ex.map(verify,urls.items()):
  results[url]=item;n+=1
  if n%100==0:print('verified',n,'/',len(urls),flush=True);(ROOT/'image-verification.json').write_text(json.dumps(results))
(ROOT/'image-verification.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print('complete',n,'errors',sum('error' in x for x in results.values()),flush=True)
