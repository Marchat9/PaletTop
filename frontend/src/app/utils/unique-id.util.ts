/**
 * An id unique enough for a list key or a notification.
 *
 * `crypto.randomUUID` only exists in a secure context - https, or localhost. Served over plain http
 * on a local network, which is how a phone reaches the app in a club, it is undefined and calling it
 * throws. The fallback is not a real UUID and does not need to be: these ids never leave the
 * browser.
 */
export function newId(): string {
  return (
    crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}
