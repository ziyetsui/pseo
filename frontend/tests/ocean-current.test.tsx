import {expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {parse} from 'node-html-parser';
import {Hub} from '@/components/Hub';
import {createFixtureCatalog} from '@/lib/catalog/fixture';
it('renders the current prototype with decorative streamlines and real accessible prompt controls',()=>{
 const c=createFixtureCatalog('zh-CN');
 const doc=parse(renderToStaticMarkup(<Hub catalog={c}/>));
 expect(doc.querySelector('[data-field="current"]')).not.toBeNull();
 expect(doc.querySelector('canvas.current-streamlines')?.getAttribute('aria-hidden')).toBe('true');
 expect(doc.querySelectorAll('[data-expand]')).toHaveLength(Math.min(54,c.prompts.length));
 expect(doc.querySelector('[data-expand]')?.getAttribute('aria-controls')).toBe(`peek-${c.prompts[0]!.id}`);
 expect(doc.querySelector('[data-field="depth"]')).toBeNull();
});
