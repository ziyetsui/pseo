import { describe, expect, it } from 'vitest';
import { parse } from 'node-html-parser';
import { verifyBilingualOutput } from '../scripts/bilingual-output.mjs';

const pair = (english: string, chinese: string) => new Map([
  ['/en/prompts', parse(english)],
  ['/zh-CN/prompts', parse(chinese)],
]);

describe('built bilingual page parity', () => {
  it('accepts translated copy with identical controls and destinations', () => {
    expect(() => verifyBilingualOutput(pair(
      '<main><h1>Prompts</h1><section><button type="button">More</button><a href="/en/prompts/image">Images</a></section></main>',
      '<main><h1>提示词</h1><section><button type="button">更多</button><a href="/zh-CN/prompts/image">图片</a></section></main>',
    ))).not.toThrow();
  });

  it('rejects a page missing in either language', () => {
    expect(() => verifyBilingualOutput(new Map([['/en/prompts', parse('<main><h1>Prompts</h1></main>')]]))).toThrow('Bilingual page missing');
  });

  it('rejects controls or navigation added to one language only', () => {
    expect(() => verifyBilingualOutput(pair('<main><button>More</button></main>', '<main></main>'))).toThrow('Bilingual controls differ');
    expect(() => verifyBilingualOutput(pair('<main><a href="/en/prompts/image">Images</a></main>', '<main><a href="/zh-CN/prompts/video">视频</a></main>'))).toThrow('Bilingual navigation differs');
  });
});
