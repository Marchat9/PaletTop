import { TestBed } from '@angular/core/testing';
import { ImportRowFilter, ImportRowStatus, ImportRowView } from '../../team-import.utils';
import { TeamImportReviewStep } from './team-import-review-step';

function view(
  rowIndex: number,
  status: ImportRowStatus,
  displayName: string,
  messages: { errors?: string[]; warnings?: string[] } = {},
): ImportRowView {
  return {
    status,
    displayName,
    row: {
      rowIndex,
      name: displayName,
      players: [{ name: 'Jean' }],
      errors: messages.errors ?? [],
      warnings: messages.warnings ?? [],
    },
  };
}

function render(overrides: { canImport?: boolean; blockReason?: string | null } = {}) {
  const rows = [
    view(2, 'ignored', 'Ligne 2', { errors: ['Aucun joueur valide sur cette ligne.'] }),
    view(3, 'warning', 'Les Fous', { warnings: ['Club ignoré'] }),
    view(4, 'ready', 'Les Sages'),
  ];
  const fixture = TestBed.createComponent(TeamImportReviewStep);
  const set = (name: string, value: unknown) => fixture.componentRef.setInput(name, value);
  set('rows', rows);
  set('counts', { all: 3, ready: 1, warning: 1, ignored: 1, importable: 2 });
  set('filter', 'all');
  set('capacity', {
    existing: 255,
    importable: 2,
    max: 256,
    after: 257,
    remaining: 1,
    exceeds: true,
  });
  set(
    'blockReason',
    'blockReason' in overrides
      ? overrides.blockReason
      : '2 équipes à importer, 1 place restante (255 / 256).',
  );
  set('canImport', overrides.canImport ?? false);
  fixture.detectChanges();
  const events = { filter: [] as ImportRowFilter[], import: 0, cancel: 0, changeFile: 0 };
  const c = fixture.componentInstance;
  c.filterChange.subscribe((f) => events.filter.push(f));
  c.import.subscribe(() => events.import++);
  c.cancel.subscribe(() => events.cancel++);
  c.changeFile.subscribe(() => events.changeFile++);
  const root = fixture.nativeElement as HTMLElement;
  const buttonByText = (text: string) =>
    (Array.from(root.querySelectorAll('app-button .button')) as HTMLElement[]).find((el) =>
      el.textContent?.includes(text),
    )!;
  return { fixture, root, events, buttonByText };
}

describe('TeamImportReviewStep', () => {
  it('disables import and shows the block reason', () => {
    const { root, events, buttonByText } = render();
    const importButton = buttonByText('Importer 2 équipes');
    expect(importButton.getAttribute('aria-disabled')).toBe('true');
    importButton.click();
    expect(events.import).toBe(0);
    expect(root.querySelector('.block-reason')?.textContent).toContain('1 place restante');
  });

  it('emits import when allowed and hides the block reason', () => {
    const { root, events, buttonByText } = render({ canImport: true, blockReason: null });
    buttonByText('Importer 2 équipes').click();
    expect(events.import).toBe(1);
    expect(root.querySelector('.block-reason')).toBeNull();
  });

  it('emits filterChange from a chip', () => {
    const { root, events } = render();
    const chips = Array.from(root.querySelectorAll('button.chip')) as HTMLButtonElement[];
    expect(chips.map((chip) => chip.querySelector('span')?.textContent)).toEqual([
      'Toutes',
      'Prêtes',
      'À vérifier',
      'Ignorées',
    ]);
    expect(chips.map((chip) => chip.querySelector('.chip-count')?.textContent)).toEqual([
      '3',
      '1',
      '1',
      '1',
    ]);
    expect(chips[0].getAttribute('aria-pressed')).toBe('true');
    chips[2].click();
    expect(events.filter).toEqual(['warning']);
  });

  it('strikes out ignored rows', () => {
    const { root } = render();
    const items = Array.from(root.querySelectorAll('.row-item'));
    expect(items[0].classList.contains('ignored')).toBe(true);
    expect(items[0].querySelector('.row-name')?.classList.contains('struck')).toBe(true);
    expect(items[2].querySelector('.row-name')?.classList.contains('struck')).toBe(false);
  });

  it('shows the capacity gauge', () => {
    const { root } = render();
    expect(root.querySelector('.gauge-label')?.textContent).toContain('Après import : 257 / 256');
  });

  it('emits changeFile and cancel', () => {
    const { events, buttonByText } = render();
    buttonByText('Changer de fichier').click();
    buttonByText('Annuler').click();
    expect(events.changeFile).toBe(1);
    expect(events.cancel).toBe(1);
  });
});
