import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { Nullable } from 'src/app/models/nullable.model';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private socket: Nullable<Socket> = null;
  private currentCode: Nullable<string> = null;

  private readonly reconnected = new Subject<void>();
  /** Emits when the socket re-establishes a connection after the initial one (e.g. after a mobile lock/network drop). */
  readonly reconnected$ = this.reconnected.asObservable();

  connect(tournamentCode: string, context: { teamCode?: string; password?: string }): void {
    if (this.currentCode === tournamentCode && this.socket?.connected) return;

    this.disconnect();
    this.currentCode = tournamentCode;

    this.socket = io(environment.backBaseApiUrl, {
      transports: ['websocket'],
      auth: { tournamentCode, ...context },
    });

    let hasConnectedOnce = false;
    this.socket.on('connect', () => {
      this.socket!.emit('join-tournament');
      if (hasConnectedOnce) {
        this.reconnected.next();
      }
      hasConnectedOnce = true;
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.currentCode = null;
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
