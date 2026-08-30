import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

let lastSocket: ReturnType<typeof createFakeSocket>;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    lastSocket = createFakeSocket();
    return lastSocket;
  }),
}));

describe('WebSocketService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('does not emit reconnected$ on the initial connection', () => {
    const service = TestBed.inject(WebSocketService);
    const spy = vi.fn();
    service.reconnected$.subscribe(spy);

    service.connect('CODE1', {});
    lastSocket.fireConnect();

    expect(spy).not.toHaveBeenCalled();
  });

  it('emits reconnected$ when the socket connects again after the first time', () => {
    const service = TestBed.inject(WebSocketService);
    const spy = vi.fn();
    service.reconnected$.subscribe(spy);

    service.connect('CODE1', {});
    lastSocket.fireConnect();
    lastSocket.fireConnect();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not treat a fresh connect() to a different tournament as a reconnect', () => {
    const service = TestBed.inject(WebSocketService);
    const spy = vi.fn();
    service.reconnected$.subscribe(spy);

    service.connect('CODE1', {});
    lastSocket.fireConnect();

    service.connect('CODE2', {});
    lastSocket.fireConnect();

    expect(spy).not.toHaveBeenCalled();
  });
});
