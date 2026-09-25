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
    if (this.currentKey === key && this.socket?.connected) return;

    this.disconnect();
    this.currentKey = key;

    this.socket = io(environment.backBaseApiUrl, {
      transports: ['websocket'],
      auth,
    });

    let hasConnectedOnce = false;
    this.socket.on('connect', () => {
      this.socket!.emit(joinEvent);
      if (hasConnectedOnce) {
        this.reconnected.next();
      }
      hasConnectedOnce = true;
    });
  }

  on<T>(event: string): Observable<T> {
    return new Observable<T>((observer) => {
      this.socket?.on(event, (data: T) => observer.next(data));
      return () => this.socket?.off(event);
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
