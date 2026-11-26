import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanBracket, PlanWarning, TournamentPlan } from 'src/app/models/tournament-plan.model';
import { BracketPanel } from './bracket-panel';

function bracket(overrides: Partial<PlanBracket> = {}): PlanBracket {
  return {
    key: 'principale',
    label: 'Principale',
    capacity: 64,
    teamCount: 64,
    fillRatio: 1,
    fillLevel: 'ok',
    extra: false,
    ...overrides,
  };
}

function plan(warnings: PlanWarning[] = [], comfortText: string | null = null): TournamentPlan {
  return {
    teamCount: 96,
    eliminatedAfterQualifying: 0,
    brackets: [bracket(), bracket({ key: 'consolante_1', label: 'Consolante A', teamCount: 32 })],
    rounds: [],
    totalRounds: 6,
    maxPlates: 48,
    warnings,
    comfort: comfortText ? { optimalCount: 96, okFrom: 90, text: comfortText } : null,
    options: [],
  };
}

interface PanelInputs {
  plan?: TournamentPlan | null;
  consolationCount?: number;
  maxConsolations?: number;
  registeredCount?: number | null;
  targetCount?: number;
}

describe('BracketPanel', () => {
  let fixture: ComponentFixture<BracketPanel>;

  function create(inputs: PanelInputs = {}): HTMLElement {
    fixture = TestBed.createComponent(BracketPanel);
    fixture.componentRef.setInput('plan', inputs.plan === undefined ? plan() : inputs.plan);
    fixture.componentRef.setInput('consolationCount', inputs.consolationCount ?? 1);
    fixture.componentRef.setInput('maxConsolations', inputs.maxConsolations ?? 4);
    fixture.componentRef.setInput('registeredCount', inputs.registeredCount ?? null);
    fixture.componentRef.setInput('targetCount', inputs.targetCount ?? 96);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const text = (el: Element | null | undefined): string =>
    (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

  const buttons = (root: HTMLElement) => ({
    add: root.querySelector<HTMLElement>('.bracket-panel__add .button'),
    remove: root.querySelector<HTMLElement>('.bracket-panel__remove .button'),
  });

  it('names the add button after the next letter and the remove button after the last one', () => {
    const root = create({ consolationCount: 2 });

    expect(text(buttons(root).add)).toContain('Ajouter la consolante C');
    expect(text(buttons(root).remove)).toContain('Supprimer la consolante B');
  });

  it('starts with the first letter and disables the remove button without consolation', () => {
    const root = create({ consolationCount: 0 });

    expect(text(buttons(root).add)).toContain('Ajouter la consolante A');
    expect(buttons(root).remove?.classList.contains('disabled')).toBe(true);
    expect(buttons(root).add?.classList.contains('disabled')).toBe(false);
  });

  it('disables the add button at the maximum of the setting', () => {
    const root = create({ consolationCount: 4, maxConsolations: 4 });

    expect(buttons(root).add?.classList.contains('disabled')).toBe(true);
    expect(buttons(root).remove?.classList.contains('disabled')).toBe(false);
  });

  it('emits the add and remove requests, and nothing from a disabled button', () => {
    const root = create({ consolationCount: 1 });
    const added = vi.fn();
    const removed = vi.fn();
    fixture.componentInstance.addConsolation.subscribe(added);
    fixture.componentInstance.removeConsolation.subscribe(removed);

    buttons(root).add?.click();
    buttons(root).remove?.click();
    expect(added).toHaveBeenCalledTimes(1);
    expect(removed).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('consolationCount', 0);
    fixture.detectChanges();
    buttons(root).remove?.click();
    expect(removed).toHaveBeenCalledTimes(1);
  });

  it('shows the chips of the plan and the comfort text', () => {
    const root = create({ plan: plan([], 'Idéal à 96 équipes.') });

    expect(root.querySelectorAll('.bracket-chip').length).toBe(2);
    expect(text(root.querySelector('.bracket-panel__comfort'))).toBe('Idéal à 96 équipes.');
  });

  it('shows one message: error, then extra bracket, then fill, then the all-clear', () => {
    const error: PlanWarning = { code: 'IMPOSSIBLE', level: 'error', message: 'Impossible.' };
    const extra: PlanWarning = { code: 'EXTRA_BRACKET', level: 'info', message: 'En plus.' };
    const mid: PlanWarning = { code: 'MID_FILL', level: 'info', message: 'Repêchés.' };
    const message = (root: HTMLElement) =>
      text(root.querySelector('.bracket-panel__message .notice-text'));

    const withAll = create({ plan: plan([mid, extra, error]) });
    expect(message(withAll)).toBe('Impossible.');
    expect(withAll.querySelectorAll('app-inline-notice').length).toBe(1);

    expect(message(create({ plan: plan([mid, extra]) }))).toBe('En plus.');
    expect(message(create({ plan: plan([mid]) }))).toBe('Repêchés.');
    expect(message(create({ plan: plan() }))).toBe('Tous les tableaux sont bien remplis.');
  });

  it('keeps the message slot, empty, while there is no plan yet', () => {
    const root = create({ plan: null });

    expect(root.querySelector('.bracket-panel__message')).not.toBeNull();
    expect(text(root.querySelector('.bracket-panel__message'))).toBe('');
  });

  it('shows « N inscrites / cible M » in draft edit only', () => {
    expect(text(create({ registeredCount: 112, targetCount: 128 }))).toContain(
      '112 inscrites / cible 128',
    );
    expect(text(create({ registeredCount: 1, targetCount: 128 }))).toContain(
      '1 inscrite / cible 128',
    );
    expect(text(create({ registeredCount: null }))).not.toContain('inscrite');
  });
});
