/** Frames during which the section is kept in view (about 1.5 s): longer than a form takes to draw. */
const MAX_FRAMES = 90;
/** Frames without the section moving after which it is considered in place. */
const STABLE_FRAMES = 20;
/** Pixels the section may drift before it is brought back. */
const TOLERANCE_PX = 2;
const USER_SCROLL_EVENTS = ['wheel', 'touchstart', 'keydown'] as const;

/**
 * Brings the element `id` to the top of its scroll container, and keeps it there while the page
 * lays out around it: a form draws its sections one after the other, so one scroll aimed at the
 * layout of the moment ends up above or below the section once the rest is there. Stops as soon
 * as the section has stayed in place, or the user scrolls.
 */
export function keepSectionInView(id: string): void {
  let frame = 0;
  let stableFrames = 0;
  let placedAt: number | null = null;
  let userScrolled = false;
  const onUserScroll = (): void => {
    userScrolled = true;
  };
  USER_SCROLL_EVENTS.forEach((type) =>
    window.addEventListener(type, onUserScroll, { once: true, passive: true }),
  );
  const stop = (): void =>
    USER_SCROLL_EVENTS.forEach((type) => window.removeEventListener(type, onUserScroll));

  const step = (): void => {
    if (userScrolled || ++frame > MAX_FRAMES) {
      stop();
      return;
    }
    const section = document.getElementById(id);
    if (section) {
      const top = section.getBoundingClientRect().top;
      if (placedAt === null || Math.abs(top - placedAt) > TOLERANCE_PX) {
        section.scrollIntoView({ block: 'start' });
        placedAt = section.getBoundingClientRect().top;
        stableFrames = 0;
      } else if (++stableFrames >= STABLE_FRAMES) {
        stop();
        return;
      }
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
