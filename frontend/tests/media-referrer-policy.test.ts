import {afterEach,expect,it,vi} from 'vitest';
import {generateMetadata} from '../src/app/[locale]/layout';
afterEach(()=>vi.unstubAllEnvs());
it('omits the Referer on authorized beta requests so original X videos can play',()=>{vi.stubEnv('FRONTEND_DATA_MODE','git-beta');expect(generateMetadata().referrer).toBe('no-referrer');});
it('keeps the public-api and isolated visual-fixture metadata policy unchanged',()=>{for(const mode of ['public-api','visual-fixture']){vi.stubEnv('FRONTEND_DATA_MODE',mode);expect(generateMetadata().referrer).toBeUndefined();}});
