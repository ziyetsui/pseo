import { describe, expect, it } from 'vitest';
import { createFixtureCatalog } from '../src/lib/catalog/fixture';
import { filterPrompts } from '../src/lib/catalog/query';
import { isStructuredPrompt, taskFindings } from '../src/lib/catalog/task-findings';
const catalog = createFixtureCatalog('zh-CN');
describe('Findings count the selected task subset', () => {
  it('uses tagged evidence and keeps every matching record reachable', () => {
    const rows = filterPrompts(catalog, {useCase:['beauty']});
    const { findings, rest } = taskFindings(rows);
    expect(findings.find(f => f.key === 'portrait')?.count).toBe(13);
    expect(findings.find(f => f.key === 'camera')?.count).toBe(12);
    expect(findings.find(f => f.key === 'video')?.count).toBe(3);
    expect(new Set([...findings.map(f => f.prompt.id), ...rest.map(p=>p.id)])).toEqual(new Set(rows.map(p=>p.id)));
    const images = taskFindings(rows.filter(p=>p.kind==='image'));
    expect(images.findings.some(f=>f.key==='video')).toBe(false);
    expect(images.findings.find(f=>f.key==='author')?.count).toBe(10);
  });
  it('handles singleton, missing evidence, and empty sets without fabricated findings', () => {
    const row = catalog.prompts[0]!;
    const minimal = {...row, subjects:[], techniques:[], handle:'', prompt:'A plain instruction.', kind:'other' as const};
    expect(taskFindings([minimal])).toEqual({findings:[], rest:[minimal]});
    expect(taskFindings([])).toEqual({findings:[],rest:[]});
    const singleton = taskFindings([{...minimal,handle:'@author'}]);
    expect(singleton.findings[0]?.heading).toBe('One prompt names its author.');
    expect(singleton.rest).toEqual([]);
  });
  it('keeps source-based structure grouping identical after translation', () => {
    const source = catalog.prompts[0]!;
    const localized = { ...source, prompt: '中文译文，包含一段普通说明。', originalPrompt: '{"scene":"a studio"}' };
    expect(isStructuredPrompt(localized)).toBe(true);
    expect(isStructuredPrompt({ ...localized, originalPrompt: 'A plain instruction.', prompt: '{"场景":"摄影棚"}' })).toBe(false);
  });
});
