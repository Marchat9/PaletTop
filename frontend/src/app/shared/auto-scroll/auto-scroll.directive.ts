import { Directive, ElementRef, OnDestroy, effect, inject, input } from '@angular/core';

@Directive({
  selector: '[appAutoScroll]',
})
export class AutoScrollDirective implements OnDestroy {
  readonly enabled = input<boolean>(false, { alias: 'appAutoScroll' });
  readonly speedPxPerSec = input<number>(30);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly pauseMs = 1500;

  private frameId: number | null = null;
  private lastTimestamp: number | null = null;
  private pausedUntil: number | null = null;

  constructor() {
    effect(() => {
      if (this.enabled()) {
        this.start();
      } else {
        this.stop();
      }
    });
  }

  ngOnDestroy(): void {
    this.stop();
  }

  private start(): void {
    if (this.frameId !== null) return;
    this.lastTimestamp = null;
    this.pausedUntil = null;
    this.frameId = requestAnimationFrame(this.tick);
  }

  private stop(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.lastTimestamp = null;
    this.pausedUntil = null;
  }

  private readonly tick = (timestamp: number): void => {
    const el = this.elementRef.nativeElement;
    const maxScroll = el.scrollHeight - el.clientHeight;

    if (maxScroll <= 0) {
      this.frameId = requestAnimationFrame(this.tick);
      return;
    }

    if (this.pausedUntil !== null) {
      if (timestamp >= this.pausedUntil) {
        this.pausedUntil = null;
        el.scrollTop = 0;
      }
      this.lastTimestamp = timestamp;
      this.frameId = requestAnimationFrame(this.tick);
      return;
    }

    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestamp;
    }
    const deltaSeconds = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    const next = el.scrollTop + this.speedPxPerSec() * deltaSeconds;
    if (next >= maxScroll) {
      el.scrollTop = maxScroll;
      this.pausedUntil = timestamp + this.pauseMs;
    } else {
      el.scrollTop = next;
    }

    this.frameId = requestAnimationFrame(this.tick);
  };
}
