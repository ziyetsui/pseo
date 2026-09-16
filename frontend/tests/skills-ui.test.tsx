// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SkillsCopy } from '../src/components/SkillsCopy';
import { SkillsIndex, SkillDetail } from '../src/components/Skills';
import { SkillsMarkdown } from '../src/components/SkillsMarkdown';
import { skills, ALL_SKILLS_INSTALL_COMMAND } from '../src/lib/skills';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('skills distribution UI', () => {
  it('keeps copying disabled in server HTML until hydration attaches the clipboard handler', async () => {
    const element = <SkillsCopy text={ALL_SKILLS_INSTALL_COMMAND} label="Copy install command" iconOnly />;
    const container = document.createElement('div');
    container.innerHTML = renderToString(element);
    document.body.appendChild(container);
    expect(container.querySelector('button')?.disabled).toBe(true);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(element, { container, hydrate: true });
    await waitFor(() => expect(container.querySelector('button')?.disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Copy install command' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Copied to clipboard.'));
    expect(writeText).toHaveBeenCalledWith(ALL_SKILLS_INSTALL_COMMAND);
  });

  it('exposes all skills as real locale routes and preserves full source in every detail', () => {
    const index = render(<SkillsIndex locale="zh-CN" />);
    for (const skill of skills) {
      expect(index.container.querySelector(`a[href="/zh-CN/skills/${skill.id}"]`)).not.toBeNull();
    }
    expect(index.container.querySelector('pre')?.textContent).toBe(ALL_SKILLS_INSTALL_COMMAND);
    expect(index.container.querySelectorAll('h1')).toHaveLength(1);
    index.unmount();
    for (const skill of skills) {
      const detail = render(<SkillDetail locale="en" skill={skill} />);
      expect(detail.container.querySelector('.skills-raw-source pre')?.textContent).toBe(skill.markdown);
      expect(detail.container.querySelectorAll('h1')).toHaveLength(1);
      expect(detail.container.querySelector('a[href="/en/skills"]')).not.toBeNull();
      detail.unmount();
    }
  });

  it('copies the entire exact command and reports success only after clipboard resolves', async () => {
    let resolveWrite: (() => void) | undefined;
    const writeText = vi.fn(() => new Promise<void>(resolve => { resolveWrite = resolve; }));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<SkillsCopy text={ALL_SKILLS_INSTALL_COMMAND} label="Copy install command" iconOnly />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy install command' }));
    expect(writeText).toHaveBeenCalledWith(ALL_SKILLS_INSTALL_COMMAND);
    expect(screen.getByRole('status').textContent).toBe('');
    resolveWrite?.();
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Copied to clipboard.'));
  });

  it('reports clipboard denial without claiming a copy succeeded', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) } });
    render(<SkillsCopy text="test" label="Copy agent instructions" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy agent instructions' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Copy failed. Select and copy the text manually.'));
    expect(screen.queryByText('Copied')).toBeNull();
  });

  it('treats embedded commands and HTML as text and resolves shipped relative references safely', () => {
    const markdown = '# Instructions\n\n<script>alert(1)</script>\n\n[unsafe](javascript:alert) [reference](references/method.md)\n\n```sh\nrm -rf ./example\n```\n\n| Input | Output |\n| --- | --- |\n| URL | Audit |';
    const { container } = render(<SkillsMarkdown markdown={markdown} sourceUrl="/skills/source/pseo/SKILL.md" />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(container.querySelector('a[href="/skills/source/pseo/references/method.md"]')).not.toBeNull();
    expect(container.querySelector('pre code')?.textContent).toBe('rm -rf ./example');
    expect(container.querySelectorAll('tbody td')).toHaveLength(2);
  });
});
