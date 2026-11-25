import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FillLevel } from 'src/app/models/tournament-plan.model';
import { Button } from '../button/button';

/** Which of the two thresholds: « ok » is the green one, « warning » the orange one. */
export type GaugeThreshold = 'ok' | 'warning';

export const GAUGE_EXAMPLE_SIZES = [8, 16, 32, 64];

const MIN_PERCENT = 50;
const MAX_PERCENT = 100;

interface GaugeZone {
  level: FillLevel;
  name: string;
  left: string;
  width: string;
}

interface GaugeStepper {
  threshold: GaugeThreshold;
  label: string;
  percent: number;
  level: FillLevel;
  canDecrease: boolean;
  canIncrease: boolean;
}

interface ExampleZone {
  level: FillLevel;
  name: string;
  /** « de 29 à 32 », or a single number. */
  range: string;
  /** False when no team count falls in the zone. */
  hasTeams: boolean;
  /** « 0 à 1 repêché », empty when no team count falls in the zone. */
  bestLosers: string;
}

/** Same comparisons as the backend `fillLevel`, so that the example matches the real plans. */
function levelOf(
  count: number,
  capacity: number,
  okRatio: number,
  warningRatio: number,
): FillLevel {
  const ratio = count / capacity;
  if (ratio >= okRatio) return 'ok';
  return ratio >= warningRatio ? 'mid' : 'low';
}

/** Teams brought back at the end of the first round so that the next one fills `capacity / 2`. */
function bestLosersOf(count: number, capacity: number): number {
  return Math.max(0, capacity / 2 - Math.ceil(count / 2));
}

function keyDirection(key: string): 1 | -1 | null {
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      return -1;
    case 'ArrowRight':
    case 'ArrowUp':
      return 1;
    default:
      return null;
  }
}

function percentOf(ratio: number): number {
  return Math.round(ratio * 100);
}

function positionOf(percent: number): string {
  return `${(percent - MIN_PERCENT) * 2}%`;
}

function bestLosersText(min: number, max: number): string {
  if (max === 0) return 'aucun repêché';
  const range = min === max ? `${min}` : `${min} à ${max}`;
  return `${range} repêché${max > 1 ? 's' : ''}`;
}

/**
 * Fill thresholds of a bracket on one 50 % - 100 % track: red below the warning threshold, orange up
 * to the ok threshold, green from it. Both handles are draggable (and keyboard operable), each
 * threshold also has a - / + stepper, and an example shows what the thresholds give for a bracket.
 */
@Component({
  selector: 'app-threshold-gauge',
  imports: [Button],
  templateUrl: './threshold-gauge.html',
  styleUrl: './threshold-gauge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThresholdGauge {
  public readonly okRatio = input.required<number>();
  public readonly warningRatio = input.required<number>();
  public readonly exampleSize = input<number>(32);

  public readonly okRatioChange = output<number>();
  public readonly warningRatioChange = output<number>();

  public readonly exampleSizes = GAUGE_EXAMPLE_SIZES;

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly dragged = signal<GaugeThreshold | null>(null);
  protected readonly selectedSize = linkedSignal(() => this.exampleSize());

  protected readonly okPercent = computed(() => percentOf(this.okRatio()));
  protected readonly warningPercent = computed(() => percentOf(this.warningRatio()));
  public readonly okPosition = computed(() => positionOf(this.okPercent()));
  public readonly warningPosition = computed(() => positionOf(this.warningPercent()));

  protected readonly zones = computed<GaugeZone[]>(() => [
    { level: 'low', name: 'Beaucoup', left: '0%', width: this.warningPosition() },
    {
      level: 'mid',
      name: 'Quelques',
      left: this.warningPosition(),
      width: `${(this.okPercent() - this.warningPercent()) * 2}%`,
    },
    {
      level: 'ok',
      name: 'Complet',
      left: this.okPosition(),
      width: `${(MAX_PERCENT - this.okPercent()) * 2}%`,
    },
  ]);

  public readonly steppers = computed<GaugeStepper[]>(() => [
    {
      threshold: 'warning',
      label: 'Rouge / orange',
      percent: this.warningPercent(),
      level: 'low',
      canDecrease: this.canStep('warning', -1),
      canIncrease: this.canStep('warning', 1),
    },
    {
      threshold: 'ok',
      label: 'Orange / vert',
      percent: this.okPercent(),
      level: 'ok',
      canDecrease: this.canStep('ok', -1),
      canIncrease: this.canStep('ok', 1),
    },
  ]);

  public readonly exampleZones = computed<ExampleZone[]>(() => {
    const capacity = this.selectedSize();
    const counts = Array.from({ length: capacity / 2 }, (_, index) => capacity / 2 + 1 + index);
    const zone = (level: FillLevel, name: string): ExampleZone => {
      const inZone = counts.filter(
        (count) => levelOf(count, capacity, this.okRatio(), this.warningRatio()) === level,
      );
      if (!inZone.length)
        return { level, name, range: 'aucun cas', hasTeams: false, bestLosers: '' };
      const first = inZone[0];
      const last = inZone[inZone.length - 1];
      return {
        level,
        name,
        range: first === last ? `${first}` : `de ${first} à ${last}`,
        hasTeams: true,
        // The fewer teams, the more best losers: the first count gives the maximum.
        bestLosers: bestLosersText(bestLosersOf(last, capacity), bestLosersOf(first, capacity)),
      };
    };
    return [
      zone('ok', 'Complet ou presque'),
      zone('mid', 'Quelques repêchés'),
      zone('low', 'Beaucoup de repêchés'),
    ];
  });

  // ========= Thresholds =========

  private percentOfThreshold(threshold: GaugeThreshold): number {
    return threshold === 'ok' ? this.okPercent() : this.warningPercent();
  }

  /** Warning stays above 50 % and below ok, ok stays above warning and at most 100 %. */
  private clampPercent(threshold: GaugeThreshold, percent: number): number {
    return threshold === 'ok'
      ? Math.min(MAX_PERCENT, Math.max(this.warningPercent() + 1, percent))
      : Math.min(this.okPercent() - 1, Math.max(MIN_PERCENT + 1, percent));
  }

  private moveTo(threshold: GaugeThreshold, percent: number): void {
    const next = this.clampPercent(threshold, Math.round(percent));
    if (next === this.percentOfThreshold(threshold)) return;
    (threshold === 'ok' ? this.okRatioChange : this.warningRatioChange).emit(next / 100);
  }

  private canStep(threshold: GaugeThreshold, direction: 1 | -1): boolean {
    const current = this.percentOfThreshold(threshold);
    return this.clampPercent(threshold, current + direction) !== current;
  }

  public onStep(threshold: GaugeThreshold, direction: 1 | -1): void {
    this.moveTo(threshold, this.percentOfThreshold(threshold) + direction);
  }

  public onKeydown(threshold: GaugeThreshold, event: KeyboardEvent): void {
    const direction = keyDirection(event.key);
    if (!direction) return;
    event.preventDefault();
    this.onStep(threshold, direction);
  }

  // ========= Dragging =========

  public onPointerDown(threshold: GaugeThreshold, event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.dragged.set(threshold);
  }

  public onPointerMove(threshold: GaugeThreshold, event: PointerEvent): void {
    if (this.dragged() !== threshold) return;
    const { left, width } = this.track().nativeElement.getBoundingClientRect();
    const fraction = (event.clientX - left) / width;
    this.moveTo(threshold, MIN_PERCENT + fraction * (MAX_PERCENT - MIN_PERCENT));
  }

  public onPointerUp(): void {
    this.dragged.set(null);
  }

  public onExampleSizeSelect(size: number): void {
    this.selectedSize.set(size);
  }
}
