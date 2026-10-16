import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createGitBetaCatalog} from '@/lib/catalog/git-beta';
import {xhsCurationHref,xhsStudies} from '@/data/xhs-curation';
import {XhsCurationPage} from '@/components/XhsCuration';
import {catalogPaths} from '@/site/routes';

const coverHashes:Record<string,string>={
  '69155ec50000000004016537':'7808d9da22be77504e9fad848c06625a02a8500a2fb5ea30374e679bdb3631e5',
  '69fed5c4000000001a037df5':'9542d12879d354cb174478bb506d421b2efffec4dcd1c5dc098737c55ca74493',
  '6948a40c000000001e03739c':'64d460ea9298ffa3752c98920e7aa7c1fbdd4a89f587870ead1f9cfe41294e4a',
  '68f72c01000000000503879d':'434f8d08a923d4005c189a4578e481883119ea130385c7fd40b839c404769e90',
  '6a1ffc78000000002101bf0e':'5f8955e7db910c5a7383638592a5ab4efdca6ee0ca4fc592efaf4601527d795c',
  '6949fa24000000001f005425':'f08bd807686c90a4efbd9a310f057950cd75e88b62ecbd1bc8bd97120b181489',
  '6a1033e30000000006032363':'4926bdc573af8aadf1e1ca134bf0f7462232702d95e2b865e668371c8c468b5f',
  '69f1eb7a000000001f00159f':'ebaa0f344fa25e243198beaaae0dde3987a42fb09b0ea1ddb00d01791895fbbe',
};

describe('Xiaohongshu creator selection',()=>{
  it('keeps one source-backed case per format and pinned local cover',()=>{
    expect(xhsStudies).toHaveLength(8);
    expect(new Set(xhsStudies.map(row=>row.category)).size).toBe(8);
    for(const row of xhsStudies){
      const url=new URL(row.sourceUrl);
      expect(url.hostname).toBe('www.xiaohongshu.com');
      expect(url.pathname).toBe(`/explore/${row.id}`);
      expect(url.searchParams.get('xsec_token')).toBeTruthy();
      const bytes=readFileSync(new URL(`../public${row.cover}`,import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(coverHashes[row.id]);
    }
  });
  it('exports bilingual beta routes and shows the source and snapshot count',()=>{
    for(const locale of ['en','zh-CN'] as const){
      const catalog=createGitBetaCatalog(locale);
      expect(catalogPaths(catalog)).toContain(xhsCurationHref(locale));
      const html=renderToStaticMarkup(<XhsCurationPage catalog={catalog}/>);
      for(const row of xhsStudies){
        expect(html).toContain(row.id);
        expect(html).toContain(row.likes.toLocaleString(locale==='en'?'en-US':'zh-CN'));
      }
      expect(html).not.toContain('Copy prompt');
    }
  },30000);
});
