import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { TeamImportWizard, TeamImportWizardData } from './team-import-wizard';

// vi.mock cannot intercept local modules in the Angular unit-test builder (see
// app.pwa-install.spec.ts), so real CSV files go through the real parser instead.
const HEADER = 'Nom Équipe (optionnel),Nom Joueur 1,Nom Club 1';

function csv(...lines: string[]): File {
  return new File([[HEADER, ...lines].join('\n')], 'equipes.csv', { type: 'text/csv' });
}

function render(data: TeamImportWizardData = { existingTeamCount: 0, maxTeamCapacity: 16 }) {
  const close = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      { provide: DIALOG_DATA, useValue: data },
      { provide: DialogRef, useValue: { close } },
    ],
  });
  const fixture = TestBed.createComponent(TeamImportWizard);
  fixture.detectChanges();
  const wizard = fixture.componentInstance;
  const select = async (file: File) => {
    await wizard.onFileSelected(file);
    fixture.detectChanges();
  };
  return { fixture, wizard, close, select, root: fixture.nativeElement as HTMLElement };
}

describe('TeamImportWizard', () => {
  it('starts on step 1 with a player count capped by the maximum', () => {
    const { wizard } = render();
    expect(wizard.step()).toBe(1);
    expect(wizard.playersCount()).toBe(2);
    expect(wizard.progressLabel()).toBe('Étape 1 sur 3');
  });

  it('moves to step 2 on continue', () => {
    const { wizard } = render();
    wizard.onContinue();
    expect(wizard.step()).toBe(2);
    expect(wizard.progressLabel()).toBe('Étape 2 sur 3');
  });

  it('goes to step 3 automatically after a successful parse', { timeout: 60_000 }, async () => {
    const { wizard, select } = render();
    await select(csv('Les Fous,Jean,Club A', ',Marie,'));
    expect(wizard.step()).toBe(3);
    expect(wizard.fileError()).toBeNull();
    expect(wizard.isParsing()).toBe(false);
    expect(wizard.counts().importable).toBe(2);
    expect(wizard.canImport()).toBe(true);
  });

  it('stays on step 2 with an error view when the parse fails', { timeout: 60_000 }, async () => {
    const { wizard, select } = render();
    wizard.onContinue();
    await select(new File(['Equipe,Truc\nA,B'], 'bad.csv', { type: 'text/csv' }));
    expect(wizard.step()).toBe(2);
    expect(wizard.fileError()?.fileName).toBe('bad.csv');
    expect(wizard.fileError()?.message).toContain('Nom Joueur N');
    expect(wizard.fileError()?.foundHeaders).toEqual(['Equipe', 'Truc']);
    expect(wizard.fileError()?.expectedHeaders).toContain('Nom Joueur 2');
  });

  it('stays on step 2 when the file holds no team', { timeout: 60_000 }, async () => {
    const { wizard, select } = render();
    wizard.onContinue();
    await select(csv());
    expect(wizard.step()).toBe(2);
    expect(wizard.fileError()?.message).toBe('Aucune équipe trouvée dans le fichier.');
  });

  it('closes with importable teams and the ignored row count', { timeout: 60_000 }, async () => {
    const { wizard, close, select } = render();
    await select(csv('Les Fous,Jean,Club A', 'Vide,,'));
    wizard.onImport();
    expect(close).toHaveBeenCalledWith({
      teams: [{ name: 'Les Fous', players: [{ name: 'Jean', club: 'Club A' }] }],
      ignoredRows: 1,
    });
  });

  it('does not close on import when blocked by the capacity', { timeout: 60_000 }, async () => {
    const { wizard, close, select } = render({ existingTeamCount: 1, maxTeamCapacity: 1 });
    await select(csv('A,Jean,'));
    expect(wizard.blockReason()).toContain('place restante');
    wizard.onImport();
    expect(close).not.toHaveBeenCalled();
  });

  it('filters the visible rows', { timeout: 60_000 }, async () => {
    const { wizard, select } = render();
    await select(csv('A,Jean,', 'Vide,,'));
    wizard.onFilterChange('ignored');
    expect(wizard.visibleRows()).toHaveLength(1);
  });

  it('goes back to step 2 to change the file', { timeout: 60_000 }, async () => {
    const { wizard, select } = render();
    await select(csv('A,Jean,'));
    wizard.onChangeFile();
    expect(wizard.step()).toBe(2);
  });

  it('closes with undefined on cancel', () => {
    const { wizard, close } = render();
    wizard.onCancel();
    expect(close).toHaveBeenCalledWith(undefined);
  });
});
