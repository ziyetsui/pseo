import type {Props} from '../shared';
export default function Current({task,initialModel}:Props){return <iframe className="current-frame" title={`Current ${task.label} filtered L1`} src={`http://127.0.0.1:3000/zh-CN/prompts?useCase=${encodeURIComponent(task.slug)}${initialModel?`&model=${encodeURIComponent(initialModel)}`:''}`}/>}
