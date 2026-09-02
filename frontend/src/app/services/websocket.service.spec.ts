import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { io } from 'socket.io-client';
import { WebSocketService } from './websocket.service';

type ConnectHandler = () => void;

function createFakeSocket() {
  const connectHandlers: ConnectHandler[] = [];
  return {
    on: vi.fn((event: string, cb: ConnectHandler) => {
      if (event === 'connect') connectHandlers.push(cb);
    }),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    fireConnect: () => connectHandlers.forEach((cb) => cb()),
  };
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => createFakeSocket()),
}));

// Reads the socket straight from the mock's own call history instead of stashing it in an
// outer `let` mutated by the mock factory — vi.mock() factories are hoisted above imports and
// top-level declarations, so relying on a closure-captured variable there is fragile across
// bundlers/environments (this test passed locally but failed in CI for exactly that reason).
function getLastSocket(): ReturnType<typeof createFakeSocket> {
  const results = vi.mocked(io).mock.results;
  const last = results.at(-1);
  if (!last || last.type !== 'return') {
    throw new Error('io() was not called');
  }
  // vi.mocked(io) types its return as the real socket.io Socket (inferred from the real
  // import), but at runtime the mocked factory above always returns our fake socket.
  return last.value as unknown as ReturnType<typeof createFakeSocket>;
}

describe('WebSocketService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('does not emit reconnected$ on the initial connection', () => {
    const service = TestBed.inject(WebSocketService);
    const spy = vi.fn();
    service.reconnected$.subscribe(spy);

    service.connect('CODE1', {});
    getLastSocket().fireConnect();

    expect(spy).not.toHaveBeenCalled();
  });

  it('emits reconnected$ when the socket connects again after the first time', () => {
    const service = TestBed.inject(WebSocketService);
    const spy = vi.fn();
    service.reconnected$.subscribe(spy);

    service.connect('CODE1', {});
    getLastSocket().fireConnect();
    getLastSocket().fireConnect();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not treat a fresh connect() to a different tournament as a reconnect', () => {
    const service = TestBed.inject(WebSocketService);
    const spy = vi.fn();
    service.reconnected$.subscribe(spy);

    service.connect('CODE1', {});
    getLastSocket().fireConnect();

    service.connect('CODE2', {});
    getLastSocket().fireConnect();

    expect(spy).not.toHaveBeenCalled();
  });
});
