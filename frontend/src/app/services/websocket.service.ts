import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { Nullable } from 'src/app/models/nullable.model';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private socket: Nullable<Socket> = null;
  // Contexte, code et rôle : tournoi et entraînement ont des codes indépendants, et le serveur
  // ne place pas dans la même room un administrateur et un joueur. Passer de l'un à l'autre doit
  // donc rouvrir le socket, même sur le même code.
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
   * Rejoint la room d'une séance d'entraînement. Avec un mot de passe, le serveur place le
   * socket dans la room admin, dont les mises à jour de séance portent les codes participants.
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
