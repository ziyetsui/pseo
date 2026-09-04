import type { Axis, Prompt, Ref } from './types';

export const taskFields = { model: 'models', useCase: 'useCases', technique: 'techniques', style: 'styles', subject: 'subjects' } as const;
export function taskTerms(rows: Prompt[], axis: Axis): Ref[] {
  const terms = new Map<string, Ref>();
  for (const row of rows) for (const ref of row[taskFields[axis]]) terms.set(ref.slug, { ...ref, count: (terms.get(ref.slug)?.count ?? 0) + 1 });
  return [...terms.values()].sort((a, b) => b.count - a.count);
}
const words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
export const spellCount = (count: number) => words[count] ?? String(count);
const capitalCount = (count: number) => { const word = spellCount(count); return word.charAt(0).toUpperCase() + word.slice(1); };
/** Describes a textual shape, not a claim that the source is valid JSON. */
export const isStructuredPrompt = (prompt: Prompt) => /^\s*(?:\{|\[\s*[\[{"\d])/.test(prompt.prompt) || /"[\w-]+"\s*:/.test(prompt.prompt);
export function taskFindings(rows: Prompt[]) {
  const total = rows.length, used = new Set<string>();
  const all = (count: number) => count === 2 ? 'Both' : `All ${spellCount(count)}`;
  const candidates = [
    { key: 'portrait', pool: rows.filter(p => p.subjects.some(r => r.slug === 'person-portrait')),
      heading: (c: number) => c === 1 ? 'One prompt is tagged as a portrait.' : c === total ? `${all(c)} of them are portraits.` : `${capitalCount(c)} of the ${spellCount(total)} are portraits.`,
      body: 'A face the model has to hold still — the same bones, the same freckles, from one render to the next.',
      note: 'Counted by the recorded subject tag, not by what the picture looks like.' },
    { key: 'structured', pool: rows.filter(isStructuredPrompt),
      heading: (c: number) => c === 1 ? 'One prompt uses structured text.' : `${capitalCount(c)} prompts use structured text.`,
      body: rows.some(p => p.editableTemplate) ? 'Structured fields keep these templates organized. Replace the highlighted placeholders while keeping the surrounding instructions intact.' : 'Braces, brackets or quoted keys organize these instructions. Their original formatting stays intact, so you can read the fields as the author wrote them.',
      note: 'Detected from the text itself: an opening brace or bracket, or quoted keys. This does not validate JSON.' },
    { key: 'camera', pool: rows.filter(p => p.techniques.some(r => r.slug === 'camera-movement-shot-language')),
      heading: (c: number) => c === 1 ? 'One prompt is tagged with camera language.' : `${capitalCount(c)} prompts are tagged with camera language.`,
      body: 'A named technique connects these prompts. Read the example to see how its author describes the camera and the shot.',
      note: 'Counted by technique tag; the tag does not establish the order of instructions.' },
    { key: 'video', pool: rows.filter(p => p.kind === 'video'),
      heading: (c: number) => c === 1 ? 'One of them moves.' : c === total ? `${all(c)} of them move.` : `${capitalCount(c)} of them move.`,
      body: 'These records are marked as video prompts. Read each one for the action, timing and sequence its author describes.',
      note: 'Counted by media kind, which is recorded per prompt and never inferred.' },
    { key: 'author', pool: rows.filter(p => p.handle.trim()),
      heading: (c: number) => c === 1 ? 'One prompt names its author.' : c === total ? `${all(c)} are signed.` : `${capitalCount(c)} of them are signed.`,
      body: 'These records name an author and link back to the source. Follow the original post to read the prompt in context.',
      note: 'The author is part of the record, not decoration on it.' },
  ].filter(c => c.pool.length);
  const findings = candidates.flatMap(c => {
    const prompt = c.pool.find(p => !used.has(p.id)) ?? c.pool[0];
    if (!prompt) return [];
    used.add(prompt.id);
    return [{ key: c.key, count: c.pool.length, heading: c.heading(c.pool.length), body: c.body, note: c.note, prompt }];
  });
  return { findings, rest: rows.filter(p => !used.has(p.id)) };
}
