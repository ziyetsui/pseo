import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {it,expect} from 'vitest';
it('rejects corrupt Library index output and missing Footer/export coverage',()=>{
 const result=execFileSync(process.execPath,['--test',fileURLToPath(new URL('../scripts/tests/library-index.test.mjs',import.meta.url))],{encoding:'utf8'});
 expect(result).toContain('fail 0');
});
