import {HubBrowse} from '@/components/Browse';
import {materials} from '../../materials';
export default function Page(){const c=materials();c.useCases=c.useCases.map(t=>({...t,href:`/editorial/${t.slug}`}));c.prompts=c.prompts.map(p=>({...p,useCases:p.useCases.map(t=>({...t,href:`/editorial/${t.slug}`}))}));return <div className="prototype-magnetic"><div className="taste"><div className="entry-note wrap"><a href="http://127.0.0.1:3000/zh-CN/prompts">← Prompt Library</a><p>Task collection · editorial directions</p></div><HubBrowse catalog={c}/></div></div>}
