import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ThresholdGauge } from './threshold-gauge';

interface PointerStub {
  pointerId: number;
  clientX: number;
  currentTarget: { setPointerCapture: (id: number) => void };
}

function pointer(clientX: number): PointerStub {
  return { pointerId: 1, clientX, currentTarget: { setPointerCapture: () => undefined } };
}

describe('ThresholdGauge', () => {
  let fixture: ComponentFixture<ThresholdGauge>;
  let component: ThresholdGauge;
  let okChanges: number[];
  let warningChanges: number[];

  function setup(okRatio = 0.9, warningRatio = 0.75, exampleSize = 32): void {
    TestBed.configureTestingModule({ imports: [ThresholdGauge] });
    fixture = TestBed.createComponent(ThresholdGauge);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('okRatio', okRatio);
    fixture.componentRef.setInput('warningRatio', warningRatio);
    fixture.componentRef.setInput('exampleSize', exampleSize);
    okChanges = [];
    warningChanges = [];
    component.okRatioChange.subscribe((value) => okChanges.push(value));
    component.warningRatioChange.subscribe((value) => warningChanges.push(value));
    fixture.detectChanges();
    // The track is 200 px wide, from x = 100: 50 % at x = 100, 100 % at x = 300.
    const track = fixture.nativeElement.querySelector('.gauge-track') as HTMLElement;
    track.getBoundingClientRect = () => ({ left: 100, width: 200 }) as DOMRect;
  }

  it('lists the team ranges of each zone for a bracket of 32 with the default thresholds', () => {
    setup();
    const zones = component.exampleZones();
    expect(zones.map((zone) => zone.range)).toEqual(['de 29 à 32', 'de 24 à 28', 'de 17 à 23']);
    expect(zones.map((zone) => zone.level)).toEqual(['ok', 'mid', 'low']);
  });

  it('counts the byes of the first round in each zone', () => {
    setup();
    expect(component.exampleZones().map((zone) => zone.byes)).toEqual([
      '0 à 3 exemptés',
      '4 à 8 exemptés',
      '9 à 15 exemptés',
    ]);
  });

  it('follows the chosen example size and shows « aucun cas » for an empty zone', () => {
    setup(1, 0.9, 8);
    const zones = component.exampleZones();
    expect(zones[0].range).toBe('8');
    expect(zones[1].range).toBe('aucun cas');
    expect(zones[0].byes).toBe('aucun exempté');
    expect(zones[2].range).toBe('de 5 à 7');
    component.onExampleSizeSelect(16);
    expect(component.exampleZones()[0].range).toBe('16');
  });

  it('places the handles on the 50 % - 100 % track', () => {
    setup();
    expect(component.warningPosition()).toBe('50%');
    expect(component.okPosition()).toBe('80%');
  });

  it('moves a handle with the pointer and emits the ratio', () => {
    setup();
    component.onPointerDown('warning', pointer(200) as unknown as PointerEvent);
    component.onPointerMove('warning', pointer(200) as unknown as PointerEvent);
    expect(warningChanges).toEqual([]);
    component.onPointerMove('warning', pointer(180) as unknown as PointerEvent);
    expect(warningChanges).toEqual([0.7]);
    component.onPointerUp();
    component.onPointerMove('warning', pointer(150) as unknown as PointerEvent);
    expect(warningChanges).toEqual([0.7]);
  });

  it('never lets the handles cross', () => {
    setup();
    component.onPointerDown('warning', pointer(250) as unknown as PointerEvent);
    component.onPointerMove('warning', pointer(299) as unknown as PointerEvent);
    expect(warningChanges.at(-1)).toBe(0.89);
    component.onPointerUp();
    component.onPointerDown('ok', pointer(290) as unknown as PointerEvent);
    component.onPointerMove('ok', pointer(100) as unknown as PointerEvent);
    expect(okChanges.at(-1)).toBe(0.76);
    component.onPointerMove('ok', pointer(1000) as unknown as PointerEvent);
    expect(okChanges.at(-1)).toBe(1);
  });

  it('keeps the warning threshold above 50 %', () => {
    setup();
    component.onPointerDown('warning', pointer(250) as unknown as PointerEvent);
    component.onPointerMove('warning', pointer(0) as unknown as PointerEvent);
    expect(warningChanges.at(-1)).toBe(0.51);
  });

  it('steps a threshold by 1 %', () => {
    setup();
    component.onStep('ok', 1);
    component.onStep('warning', -1);
    expect(okChanges).toEqual([0.91]);
    expect(warningChanges).toEqual([0.74]);
  });

  it('cannot step a threshold across the other one', () => {
    setup(0.76, 0.75);
    component.onStep('ok', -1);
    component.onStep('warning', 1);
    expect(okChanges).toEqual([]);
    expect(warningChanges).toEqual([]);
    const [warning, ok] = component.steppers();
    expect(ok.canDecrease).toBe(false);
    expect(warning.canIncrease).toBe(false);
    expect(ok.canIncrease).toBe(true);
  });

  it('cannot step beyond 50 % or 100 %', () => {
    setup(1, 0.51);
    const [warning, ok] = component.steppers();
    expect(ok.canIncrease).toBe(false);
    expect(warning.canDecrease).toBe(false);
  });

  it('moves a handle with the arrow keys', () => {
    setup();
    component.onKeydown('ok', new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    component.onKeydown('ok', new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(okChanges).toEqual([0.89, 0.91]);
  });
});
