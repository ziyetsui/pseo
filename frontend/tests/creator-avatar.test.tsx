// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { CreatorAvatar } from '@/components/CreatorAvatar';

afterEach(cleanup);

it('keeps a recognizable fallback when the image fails and retries a new source', () => {
  const { container, rerender } = render(<CreatorAvatar handle="@MrLarus" src="/creator-avatars/mrlarus.jpg" />);
  expect(container.querySelector('img')?.getAttribute('src')).toBe('/creator-avatars/mrlarus.jpg');
  fireEvent.error(container.querySelector('img')!);
  expect(container.querySelector('img')).toBeNull();
  expect(container.textContent).toBe('MR');
  rerender(<CreatorAvatar handle="@MrLarus" src="/creator-avatars/mrlarus-new.jpg" />);
  expect(container.querySelector('img')?.getAttribute('src')).toBe('/creator-avatars/mrlarus-new.jpg');
});

it('uses initials when no confirmed avatar exists', () => {
  const { container } = render(<CreatorAvatar handle="@liyue_ai" src={null} />);
  expect(container.querySelector('img')).toBeNull();
  expect(container.textContent).toBe('LI');
});
