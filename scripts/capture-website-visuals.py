from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import json,subprocess,hashlib,shutil,re
from urllib.parse import urlsplit
import argparse
parser=argparse.ArgumentParser(description='Capture original X image/video resources and preserve complete long videos as ordered segments.')
parser.add_argument('--sources',type=Path,default=Path('docs/intake/2026-10-16-website-visuals/asset-sources.json'))
parser.add_argument('--public',type=Path,default=Path('frontend/public'))
parser.add_argument('--cache',type=Path,default=Path('/tmp/ancher-website-visual-downloads'))
parser.add_argument('--results',type=Path,default=Path('/tmp/ancher-website-visual-download-results.json'))
args=parser.parse_args();ROOT=args.public;CACHE=args.cache;ROOT.mkdir(parents=True,exist_ok=True);CACHE.mkdir(parents=True,exist_ok=True)
encoders=subprocess.run(['ffmpeg','-encoders'],capture_output=True,text=True).stdout
codec=['-c:v','h264_videotoolbox','-b:v','1200k'] if 'h264_videotoolbox' in encoders else ['-c:v','libx264','-threads','2','-preset','veryfast','-crf','28']
for name in ['website-videos','website-previews']:(ROOT/name).mkdir(exist_ok=True)
jobs=json.loads(args.sources.read_text())['jobs']
def run(args,timeout=180):return subprocess.run(args,capture_output=True,text=True,timeout=timeout)
def inspect(p):
 r=run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]);d=json.loads(r.stdout);v=next(s for s in d['streams'] if s['codec_type']=='video');return v,d['format']
def download(j):
 id=j['assetId'];kind=j['kind'];url=urlsplit(j['sourceUrl'])
 if not re.fullmatch(r'\d+',id) or kind not in ['image','video'] or url.scheme!='https' or url.hostname not in ['pbs.twimg.com','video.twimg.com'] or url.username or url.password or url.port not in [None,443]:return {'assetId':id,'status':'invalid-source'}
 poster=ROOT/'website-previews'/f'{id}.jpg';target=ROOT/('website-videos' if kind=='video' else 'website-previews')/(id+('.mp4' if kind=='video' else '.jpg'))
 try:
  raw=CACHE/(id+('.mp4' if kind=='video' else '.jpg'))
  if not raw.exists():
   r=run(['curl','-fL','--retry','2','--max-time','90','-sS',j['sourceUrl'],'-o',str(raw)],120)
   if r.returncode:raw.unlink(missing_ok=True);return {'assetId':id,'status':'fetch-failed'}
  sourceSha=hashlib.sha256(raw.read_bytes()).hexdigest();v,fmt=inspect(raw);sourceDuration=float(fmt.get('duration',0));sourceWidth=v['width'];sourceHeight=v['height']
  if kind=='video' and sourceDuration>600 and raw.stat().st_size>25*1024*1024:
   split=CACHE/(id+'-parts');marker=split/'complete.json'
   def complete(folder):
    files=sorted(folder.glob('*.mp4'))
    if not files:return False
    try:return abs(sum(float(inspect(file)[1]['duration']) for file in files)-sourceDuration)<0.5
    except Exception:return False
   cached=json.loads(marker.read_text()) if marker.exists() else {}
   if cached.get('sourceSha256')!=sourceSha or not complete(split):
    temporary=CACHE/(id+'-parts-incomplete');shutil.rmtree(temporary,ignore_errors=True);temporary.mkdir()
    r=run(['ffmpeg','-nostdin','-v','error','-y','-i',str(raw),'-c','copy','-f','segment','-segment_time','480','-reset_timestamps','1','-segment_format_options','movflags=+faststart',str(temporary/'part-%03d.mp4')],600)
    if r.returncode or not complete(temporary):return {'assetId':id,'status':'segment-failed'}
    (temporary/'complete.json').write_text(json.dumps({'sourceSha256':sourceSha,'sourceDuration':sourceDuration}))
    shutil.rmtree(split,ignore_errors=True);temporary.rename(split)
   files=sorted(split.glob('*.mp4'));parts=[]
   for index,file in enumerate(files):
    partId=id+'0'+str(index+1);dest=ROOT/'website-videos'/(partId+'.mp4');thumb=ROOT/'website-previews'/(partId+'.jpg')
    if file.stat().st_size>25*1024*1024:return {'assetId':id,'status':'over-pages-limit'}
    if not dest.exists() or hashlib.sha256(dest.read_bytes()).digest()!=hashlib.sha256(file.read_bytes()).digest():
     dest.write_bytes(file.read_bytes());thumb.unlink(missing_ok=True)
    pv,pf=inspect(dest)
    if not thumb.exists():
     r=run(['ffmpeg','-nostdin','-v','error','-y','-i',str(dest),'-vf',"thumbnail=30,scale='min(1280,iw)':-2",'-frames:v','1','-q:v','3',str(thumb)])
     if r.returncode:return {'assetId':id,'status':'poster-failed'}
    parts.append({'assetId':partId,'status':'ok','kind':'video','src':'/'+str(dest.relative_to(ROOT)),'poster':'/'+str(thumb.relative_to(ROOT)),'width':pv['width'],'height':pv['height'],'duration':float(pf.get('duration',0)),'sourceDuration':sourceDuration,'sourceSha256':sourceSha,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'posterSha256':hashlib.sha256(thumb.read_bytes()).hexdigest(),'bytes':dest.stat().st_size,'sourceUrl':j['sourceUrl'],'visualSourceUrl':j['visualSourceUrl'],'part':index+1,'parts':len(files)})
   return {'assetId':id,'status':'ok','parts':parts}
  if kind=='image':
   if not target.exists():target.write_bytes(raw.read_bytes())
  elif not target.exists():
   r=run(['ffmpeg','-nostdin','-v','error','-y','-i',str(raw),'-vf',"scale='min(1280,iw)':-2",*codec,'-c:a','aac','-b:a','96k','-movflags','+faststart',str(target)],300)
   if r.returncode:target.unlink(missing_ok=True);return {'assetId':id,'status':'encode-failed'}
   if target.stat().st_size>25*1024*1024:
    duration=float(fmt.get('duration',0));budget=max(64000,int(23*1024*1024*8/max(1,duration))-96000)
    r=run(['ffmpeg','-nostdin','-v','error','-y','-i',str(raw),'-vf',"scale='min(960,iw)':-2",'-c:v','libx264','-threads','2','-preset','veryfast','-b:v',str(budget),'-maxrate',str(budget),'-bufsize',str(budget*2),'-c:a','aac','-b:a','96k','-movflags','+faststart',str(target)],600)
    if r.returncode or target.stat().st_size>25*1024*1024:target.unlink(missing_ok=True);return {'assetId':id,'status':'over-pages-limit'}
  if kind=='video' and not poster.exists():
   r=run(['ffmpeg','-nostdin','-v','error','-y','-i',str(target),'-vf',"thumbnail=30,scale='min(1280,iw)':-2",'-frames:v','1','-q:v','3',str(poster)])
   if r.returncode:return {'assetId':id,'status':'poster-failed'}
  v,fmt=inspect(target);return {'assetId':id,'status':'ok','kind':kind,'src':'/'+str(target.relative_to(ROOT)),'poster':'/'+str(poster.relative_to(ROOT)) if kind=='video' else None,'width':v['width'],'height':v['height'],'duration':float(fmt.get('duration',0)),'sourceDuration':sourceDuration,'sourceWidth':sourceWidth,'sourceHeight':sourceHeight,'sourceSha256':sourceSha,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'posterSha256':hashlib.sha256(poster.read_bytes()).hexdigest() if kind=='video' else None,'bytes':target.stat().st_size,'sourceUrl':j['sourceUrl'],'visualSourceUrl':j['visualSourceUrl']}
 except Exception as e:
  if target.exists():
   try:inspect(target)
   except Exception:target.unlink(missing_ok=True)
  return {'assetId':id,'status':'error','reason':type(e).__name__}
results=[]
with ThreadPoolExecutor(max_workers=4) as pool:
 for f in as_completed([pool.submit(download,j) for j in jobs]):
  r=f.result();results.append(r);args.results.write_text(json.dumps(results,ensure_ascii=False,indent=2));print(len(results),'/',len(jobs),r['assetId'],r['status'],flush=True)

if any(r['status']!='ok' for r in results):raise SystemExit(1)
