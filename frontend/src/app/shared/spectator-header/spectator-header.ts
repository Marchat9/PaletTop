import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Nullable } from 'src/app/models/nullable.model';
import { StatusPill } from 'src/app/shared/status-pill/status-pill';
import { Switch } from 'src/app/shared/switch/switch';
import { SpectatorBadge } from './spectator-header.model';

/** Gap between the badges of the right side, in pixels (0.5rem). */
const SIDE_GAP_PX = 8;

/**
 * Header of a spectator screen, tournament or training: the title on the left, where the event
 * stands in the middle, the round, the code and the podium switch on the right. These last ones
 * stay on one line, or are all stacked as soon as they no longer fit: never two on a line and the
 * third alone.
 */
@Component({
  selector: 'app-spectator-header',
  imports: [StatusPill, Switch],
  templateUrl: './spectator-header.html',
  styleUrl: './spectator-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpectatorHeader {
  private readonly destroyRef = inject(DestroyRef);

  /** « Tournoi », « Entraînement ». */
  public readonly kind = input.required<string>();
  public readonly title = input<Nullable<string>>(null);
  public readonly status = input<Nullable<SpectatorBadge>>(null);
  public readonly round = input<Nullable<SpectatorBadge>>(null);
  public readonly code = input<Nullable<string>>(null);
  public readonly showPodiumSwitch = input<boolean>(false);
  public readonly showPodium = input<boolean>(false);

  public readonly podiumChange = output<boolean>();

  private readonly side = viewChild<ElementRef<HTMLElement>>('side');
  public readonly stacked = signal(false);

  constructor() {
    afterNextRender(() => {
      const side = this.side()?.nativeElement;
      if (!side || typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() => this.updateStacking(side));
      observer.observe(side);
      // The badges change width with their text (a new round): observed too.
      const observeChildren = () => [...side.children].forEach((child) => observer.observe(child));
      observeChildren();
      const mutations = new MutationObserver(() => {
        observeChildren();
        this.updateStacking(side);
      });
      mutations.observe(side, { childList: true });
      this.destroyRef.onDestroy(() => {
        observer.disconnect();
        mutations.disconnect();
      });
    });
  }

  /** The badges keep their width in both layouts: their sum says whether they fit on a line. */
  private updateStacking(side: HTMLElement): void {
    const children = [...side.children] as HTMLElement[];
    const needed =
      children.reduce((total, child) => total + child.offsetWidth, 0) +
      SIDE_GAP_PX * Math.max(children.length - 1, 0);
    this.stacked.set(needed > side.clientWidth);
  }
}
