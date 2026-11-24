import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { keepSectionInView } from './keep-section-in-view.util';

describe('keepSectionInView', () => {
  let top: number;
  let scrollIntoView: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    top = 400;
    scrollIntoView = vi.fn(() => {
      top = 0;
    });
    const section = document.createElement('div');
    section.id = 'section';
    section.getBoundingClientRect = () => ({ top }) as DOMRect;
    section.scrollIntoView = scrollIntoView as unknown as typeof section.scrollIntoView;
    document.body.append(section);
  });

  afterEach(() => {
    document.getElementById('section')?.remove();
    vi.useRealTimers();
  });

  const frames = (count: number) => vi.advanceTimersByTime(count * 17);

  it('brings the section to the top of its container', () => {
    keepSectionInView('section');
    frames(2);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('brings it back when the page lays out around it and moves it', () => {
    keepSectionInView('section');
    frames(2);
    top = 900;
    frames(2);

    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('leaves it alone once it has stayed in place', () => {
    keepSectionInView('section');
    frames(40);
    top = 900;
    frames(5);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('waits for a section that is drawn later', () => {
    document.getElementById('section')?.remove();
    keepSectionInView('section');
    frames(5);
    expect(scrollIntoView).not.toHaveBeenCalled();

    const late = document.createElement('div');
    late.id = 'section';
    late.getBoundingClientRect = () => ({ top: 700 }) as DOMRect;
    late.scrollIntoView = scrollIntoView as unknown as typeof late.scrollIntoView;
    document.body.append(late);
    frames(2);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('stops as soon as the user scrolls', () => {
    keepSectionInView('section');
    frames(2);
    window.dispatchEvent(new Event('wheel'));
    top = 900;
    frames(5);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
