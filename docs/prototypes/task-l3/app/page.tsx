import { HubBrowse } from '@/components/Browse';
import { materials } from '../materials';
export default function Page(){return <div className="prototype-magnetic"><div className="taste"><div className="entry-note wrap"><a href="http://127.0.0.1:3000/zh-CN/prompts">← Prompt Library</a><p>Task page exploration · choose a task below</p></div><HubBrowse catalog={materials()}/></div></div>}
