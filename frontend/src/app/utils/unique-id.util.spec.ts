import { afterEach, describe, expect, it, vi } from 'vitest';
import { newId } from './unique-id.util';

describe('newId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('donne des identifiants distincts', () => {
    expect(newId()).not.toBe(newId());
  });

  // Served over plain http on a local network, `crypto.randomUUID` does not exist.
  it('fonctionne sans randomUUID', () => {
    vi.stubGlobal('crypto', {});

    const id = newId();

    expect(id).toBeTypeOf('string');
    expect(id.length).toBeGreaterThan(8);
    expect(id).not.toBe(newId());
  });
});
