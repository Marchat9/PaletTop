import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppVisibilityService {
  private readonly resumed = new Subject<void>();
  readonly resumed$ = this.resumed.asObservable();

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.resumed.next();
      }
    });
    window.addEventListener('focus', () => this.resumed.next());
    window.addEventListener('online', () => this.resumed.next());
  }
}
