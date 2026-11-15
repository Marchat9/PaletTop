import { TestBed } from '@angular/core/testing';
import { TeamImportFileError, TeamImportFileStep } from './team-import-file-step';

const FORMATS = '.xlsx,.xlsm,.xls,.xlt,.ods,.csv';

function render(inputs: { error?: TeamImportFileError | null; isParsing?: boolean } = {}) {
  const fixture = TestBed.createComponent(TeamImportFileStep);
  fixture.componentRef.setInput('fileName', null);
  fixture.componentRef.setInput('error', inputs.error ?? null);
  fixture.componentRef.setInput('isParsing', inputs.isParsing ?? false);
  fixture.componentRef.setInput('maxTeams', 256);
  fixture.componentRef.setInput('acceptedFormats', FORMATS);
  fixture.detectChanges();
  const selected: File[] = [];
  let backs = 0;
  fixture.componentInstance.fileSelected.subscribe((file) => selected.push(file));
  fixture.componentInstance.back.subscribe(() => backs++);
  const root = fixture.nativeElement as HTMLElement;
  const drop = (files: File[]) => {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files } });
    (root.querySelector('.drop-zone') as HTMLElement).dispatchEvent(event);
    fixture.detectChanges();
  };
  return { fixture, root, selected, drop, backs: () => backs };
}

describe('TeamImportFileStep', () => {
  it('emits the dropped accepted file', () => {
    const { selected, drop } = render();
    const file = new File(['x'], 'equipes.xlsx');
    drop([new File(['x'], 'notes.pdf'), file]);
    expect(selected).toEqual([file]);
  });

  it('rejects a dropped file with an unsupported format', () => {
    const { selected, drop, root } = render();
    drop([new File(['x'], 'notes.pdf')]);
    expect(selected).toEqual([]);
    expect(root.querySelector('.drop-error')?.textContent).toContain('Format non pris en charge');
  });

  it('shows found vs expected headers on a missing-column error', () => {
    const { root } = render({
      error: {
        fileName: 'bad.xlsx',
        message: 'Aucune colonne "Nom Joueur N" détectée.',
        foundHeaders: ['Equipe', 'Truc'],
        expectedHeaders: ['Nom Équipe (optionnel)', 'Nom Joueur 1'],
      },
    });
    expect(root.querySelector('.error-message')?.textContent).toContain('Aucune colonne');
    expect(root.querySelector('.found-headers')?.textContent).toContain('Equipe');
    expect(root.querySelector('.found-headers')?.textContent).toContain('Truc');
    expect(root.querySelector('.expected-headers')?.textContent).toContain('Nom Joueur 1');
  });

  it('offers « Choisir un autre fichier » in the error view, opening the file picker', () => {
    const { root, selected, fixture } = render({
      error: { fileName: 'bad.xlsx', message: "Ce fichier n'a pas pu être lu." },
    });
    const retry = root.querySelector('.error-actions app-input-file') as HTMLElement;
    expect(retry.textContent).toContain('Choisir un autre fichier');
    const picker = retry.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(picker, 'click').mockImplementation(() => {});

    (retry.querySelector('.input-file-trigger') as HTMLElement).click();
    expect(clickSpy).toHaveBeenCalledTimes(1);

    const file = new File(['x'], 'autre.xlsx');
    Object.defineProperty(picker, 'files', { value: [file] });
    picker.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(selected).toEqual([file]);
  });

  it('offers « Précédent » instead of the template download in the error view', () => {
    const { root, backs } = render({
      error: { fileName: 'bad.xlsx', message: "Ce fichier n'a pas pu être lu." },
    });
    expect(root.textContent).not.toContain('Télécharger le modèle');
    const button = root.querySelector('.error-actions app-button .button') as HTMLElement;
    expect(button.textContent).toContain('Précédent');
    button.click();
    expect(backs()).toBe(1);
  });

  it('emits back from « Précédent » and no longer offers the template download', () => {
    const { root, backs } = render();
    expect(root.textContent).not.toContain('Télécharger le modèle');
    const button = root.querySelector('.step-actions app-button .button') as HTMLElement;
    expect(button.textContent).toContain('Précédent');
    button.click();
    expect(backs()).toBe(1);
  });
});
