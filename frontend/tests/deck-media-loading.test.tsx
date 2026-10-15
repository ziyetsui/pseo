import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {parse} from 'node-html-parser';
import {createGitBetaCatalog} from '@/lib/catalog/git-beta';
import {DeckReader} from '@/components/DeckReader';
it('keeps all image prompt texts reachable without downloading every off-deck reference image',()=>{
 const c=createGitBetaCatalog('en'), rows=c.prompts.filter(p=>p.kind==='image');
 const doc=parse(renderToStaticMarkup(<DeckReader catalog={{...c,prompts:rows}} contentType="image" />));
 expect(doc.querySelectorAll('.dc')).toHaveLength(rows.length);
 expect(doc.querySelectorAll('.dc .media img').length).toBeLessThanOrEqual(4);
 expect(doc.querySelectorAll('.dc h3 a').at(-1)?.getAttribute('href')).toBe(rows.at(-1)?.href);
});
