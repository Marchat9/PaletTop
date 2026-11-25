import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PlanOptionId, TournamentPlan } from 'src/app/models/tournament-plan.model';
import { fewerTeamsPlan, impossiblePlan } from 'src/app/utils/launch-plan.fixtures';
import { LaunchCheck } from './launch-check';

interface LaunchCheckInputs {
  selectedOptionId?: PlanOptionId | null;
  lowFillConfirmed?: boolean;
  mobile?: boolean;
  registeredCount?: number;
  plan?: TournamentPlan;
}

describe('LaunchCheck', () => {
  let fixture: ComponentFixture<LaunchCheck>;

  function create(inputs: LaunchCheckInputs = {}) {
    fixture = TestBed.createComponent(LaunchCheck);
    fixture.componentRef.setInput('plan', inputs.plan ?? fewerTeamsPlan());
    fixture.componentRef.setInput('registeredCount', inputs.registeredCount ?? 117);
    fixture.componentRef.setInput('targetCount', 128);
    fixture.componentRef.setInput('selectedOptionId', inputs.selectedOptionId ?? null);
    fixture.componentRef.setInput('lowFillConfirmed', inputs.lowFillConfirmed ?? false);
    fixture.componentRef.setInput('mobile', inputs.mobile ?? false);
    const selected: PlanOptionId[] = [];
    const viewed: PlanOptionId[] = [];
    const confirmations: boolean[] = [];
    fixture.componentInstance.select.subscribe((id) => selected.push(id));
    fixture.componentInstance.view.subscribe((id) => viewed.push(id));
    fixture.componentInstance.lowFillConfirmedChange.subscribe((value) =>
      confirmations.push(value),
    );
    fixture.detectChanges();
    return { root: fixture.nativeElement as HTMLElement, selected, viewed, confirmations };
  }

  const text = (el: Element | null | undefined): string => {
    const copy = el?.cloneNode(true) as Element | undefined;
    copy?.querySelectorAll('app-icon').forEach((icon) => icon.remove());
    return (copy?.textContent ?? '').replace(/\s+/g, ' ').trim();
  };
  const cards = (root: HTMLElement) =>
    Array.from(root.querySelectorAll<HTMLElement>('.option-card'));

  it('compares the registered teams with the planned count', () => {
    const { root } = create();

    // The comparison and the invitation to choose are two paragraphs of the same introduction.
    const intro = Array.from(root.querySelectorAll('.launch-check__intro'))
      .map((paragraph) => text(paragraph))
      .join(' ');
    expect(intro).toBe(
      '117 équipes inscrites au lieu des 128 visées. Choisissez comment lancer le tournoi.',
    );
  });

  it('says how many teams more than planned there are', () => {
    const { root } = create({ registeredCount: 136 });

    expect(text(root.querySelector('.launch-check__intro'))).toContain(
      '136 équipes inscrites soit 8 de plus que les 128 visées.',
    );
  });

  it('offers keep, recalculate and stop the last ones', () => {
    const { root } = create();

    expect(cards(root).map((card) => text(card.querySelector('.option-card__title')))).toEqual([
      'Garder ma configuration',
      'Passer à 2 tableaux',
      'Arrêter les 5 derniers après les qualifs',
    ]);
  });

  it('badges each option with its worst fill', () => {
    const { root } = create();

    expect(cards(root).map((card) => text(card.querySelector('.option-card__fill')))).toEqual([
      'Beaucoup de repêchés',
      'Complet ou presque',
      'Complet ou presque',
    ]);
  });

  it('badges an option without any bracket as impossible, with its reason', () => {
    const { root } = create({
      plan: impossiblePlan(),
      registeredCount: 3,
      selectedOptionId: 'keep',
    });

    expect(text(cards(root)[0].querySelector('.option-card__fill'))).toBe('Impossible');
    expect(text(root.querySelector('.launch-check__route app-inline-notice'))).toBe(
      'Pas assez d’équipes pour 3 tableaux.',
    );
  });

  it('selects nothing by itself and asks for a choice', () => {
    const { root } = create();

    expect(cards(root).every((card) => card.getAttribute('aria-checked') === 'false')).toBe(true);
    expect(text(root.querySelector('.launch-check__hint'))).toBe(
      'Choisissez une configuration pour voir son parcours.',
    );
    expect(root.querySelector('app-plan-table')).toBeNull();
  });

  it('reports the option clicked, and with the keyboard', () => {
    const { root, selected } = create();

    cards(root)[1].click();
    cards(root)[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(selected).toEqual(['recalculate', 'stop_last']);
  });

  it('shows the table and the warnings of the selected option', () => {
    const { root } = create({ selectedOptionId: 'keep' });

    expect(cards(root)[0].getAttribute('aria-checked')).toBe('true');
    expect(text(Array.from(root.querySelectorAll('.launch-check__label')).at(-1))).toContain(
      'Garder ma configuration',
    );
    expect(root.querySelector('app-plan-table')).not.toBeNull();
    expect(text(root.querySelector('.launch-check__route app-inline-notice'))).toBe(
      'Consolante B : 21 équipes sur 32.',
    );
  });

  it('says there is nothing to warn about when the option has no warning', () => {
    const { root } = create({ selectedOptionId: 'recalculate' });

    expect(text(root.querySelector('.launch-check__route app-inline-notice'))).toBe(
      'Tous les tableaux sont bien remplis.',
    );
  });

  it('badges the option that removes teams between the qualifiers and the elimination', () => {
    const plan = fewerTeamsPlan();
    plan.options[0].eliminatedAfterQualifying = 3;
    plan.options[1].eliminatedAfterQualifying = 1;
    plan.options[2].eliminatedAfterQualifying = 0;
    const { root } = create({ plan });

    expect(text(cards(root)[0])).toContain('3 retirées');
    expect(text(cards(root)[1])).toContain('1 retirée');
    expect(text(cards(root)[2])).not.toContain('retirées');
  });

  it('sends the admin to the tournament configuration to set the brackets by hand', () => {
    const { root } = create();
    let requested = 0;
    fixture.componentInstance.editConfiguration.subscribe(() => requested++);

    expect(text(root.querySelector('.launch-check__manual'))).toContain(
      'Ajuster les tableaux manuellement',
    );
    (root.querySelector('.launch-check__manual .button') as HTMLElement).click();

    expect(requested).toBe(1);
  });

  it('asks for a confirmation only for an option with a nearly empty bracket', () => {
    expect(create({ selectedOptionId: 'recalculate' }).root.querySelector('app-switch')).toBeNull();
    TestBed.resetTestingModule();

    const { root, confirmations } = create({ selectedOptionId: 'keep' });
    const switchInput = root.querySelector('app-switch input') as HTMLInputElement;
    switchInput.checked = true;
    switchInput.dispatchEvent(new Event('change'));

    expect(confirmations).toEqual([true]);
  });

  it('keeps the route apart on a narrow screen, behind a button on each option', () => {
    const { root, viewed } = create({ mobile: true, selectedOptionId: 'keep' });

    expect(root.querySelector('app-plan-table')).toBeNull();
    const buttons = Array.from(root.querySelectorAll<HTMLElement>('.option-card .button'));
    expect(buttons.map(text)).toEqual(['Voir le parcours', 'Voir le parcours', 'Voir le parcours']);

    buttons[2].click();

    expect(viewed).toEqual(['stop_last']);
  });

  it('does not select an option when only its route is viewed', () => {
    const { root, selected } = create({ mobile: true });

    root.querySelector<HTMLElement>('.option-card .button')?.click();

    expect(selected).toEqual([]);
  });

  it('has no route button on a wide screen', () => {
    expect(create().root.querySelector('.option-card .button')).toBeNull();
  });
});
