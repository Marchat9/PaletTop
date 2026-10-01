import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { Nullable } from 'src/app/models/nullable.model';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private socket: Nullable<Socket> = null;
  // Context, code and role: tournament and training have independent codes, and the server does not
  // put an admin and a player in the same room. Switching from one to the other must therefore
  // reopen the socket, even on the same code.
  private currentKey: Nullable<string> = null;

  private readonly reconnected = new Subject<void>();
  /** Emits when the socket re-establishes a connection after the initial one (e.g. after a mobile lock/network drop). */
  readonly reconnected$ = this.reconnected.asObservable();

  connect(tournamentCode: string, context: { teamCode?: string; password?: string }): void {
    const role = context.password
      ? 'admin'
      : context.teamCode
        ? `team:${context.teamCode}`
        : 'public';
    this.open(
      `tournament:${tournamentCode}:${role}`,
      { tournamentCode, ...context },
      'join-tournament',
    );
  }

  /**
   * Joins the room of a training session. With a password, the server puts the socket in the admin
   * room, whose session updates carry the participant codes.
   */
  connectTrainingSession(sessionCode: string, password?: string): void {
    this.open(
      `training-session:${sessionCode}:${password ? 'admin' : 'public'}`,
      { sessionCode, password },
      'join-training-session',
    );
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.currentKey = null;
  }

  private open(key: string, auth: Record<string, unknown>, joinEvent: string): void {
    // The socket is reused as long as the room is the same, connected or not: socket.io reconnects
    // on its own with its backoff. Testing `connected` here would tear down a socket in the middle
    // of reconnecting - and the fresh one no longer knows it has connected before, so it would not
    // emit `reconnected$` and nobody would resync.
    if (this.currentKey === key && this.socket) return;

    this.disconnect();
    this.currentKey = key;

    const socket = io(environment.backBaseApiUrl, {
      transports: ['websocket'],
      auth,
    });
    this.socket = socket;

    let hasConnectedOnce = false;
    socket.on('connect', () => {
      socket.emit(joinEvent);
      if (hasConnectedOnce) {
        this.reconnected.next();
      }
      hasConnectedOnce = true;
    });
  }

  on<T>(event: string): Observable<T> {
    return new Observable<T>((observer) => {
      // Both the socket and the handler are captured here: `off(event)` alone would remove every
      // listener of that event - including another stream's - and reading `this.socket` on teardown
      // would detach the handler from whichever socket happens to be open at that moment.
      const socket = this.socket;
      const handler = (data: T) => observer.next(data);

      socket?.on(event, handler);
      return () => socket?.off(event, handler);
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
