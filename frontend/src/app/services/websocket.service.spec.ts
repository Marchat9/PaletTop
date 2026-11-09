import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SOCKET_IO, WebSocketService } from './websocket.service';

type ConnectHandler = () => void;
type FakeSocket = ReturnType<typeof createFakeSocket>;

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

// The fake sockets are handed through DI (SOCKET_IO), not by mocking the `socket.io-client`
// module: once the specs are bundled, such a module mock is not always applied, and the real
// io() then runs - the tests failed at random in the full suite and in CI.
let sockets: FakeSocket[] = [];

function getLastSocket(): FakeSocket {
  const last = sockets.at(-1);
  if (!last) {
    throw new Error('No socket was opened');
  }
  return last;
}

describe('WebSocketService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    sockets = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SOCKET_IO,
          useValue: () => {
            const socket = createFakeSocket();
            sockets.push(socket);
            return socket;
          },
        },
      ],
    });
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
