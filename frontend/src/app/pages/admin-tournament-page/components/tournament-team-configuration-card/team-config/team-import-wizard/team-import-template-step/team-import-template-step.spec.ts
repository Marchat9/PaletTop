import { TestBed } from '@angular/core/testing';
import { TeamImportTemplateStep } from './team-import-template-step';

function render(playersCount = 2) {
  const fixture = TestBed.createComponent(TeamImportTemplateStep);
  fixture.componentRef.setInput('playersCount', playersCount);
  fixture.componentRef.setInput('maxPlayers', 12);
  fixture.detectChanges();
  const component = fixture.componentInstance;
  const emitted = { skip: 0, continue: 0, download: 0, count: [] as number[] };
  component.skip.subscribe(() => emitted.skip++);
  component.continue.subscribe(() => emitted.continue++);
  component.download.subscribe(() => emitted.download++);
  component.playersCountChange.subscribe((value) => emitted.count.push(value));
  const root = fixture.nativeElement as HTMLElement;
  const buttonByText = (text: string) =>
    (Array.from(root.querySelectorAll('app-button .button')) as HTMLElement[]).find((el) =>
      el.textContent?.includes(text),
    )!;
  return { fixture, root, emitted, buttonByText };
}

describe('TeamImportTemplateStep', () => {
  it("emits skip from « J'ai déjà un fichier rempli »", () => {
    const { buttonByText, emitted } = render();
    buttonByText("J'ai déjà un fichier rempli").click();
    expect(emitted.skip).toBe(1);
    expect(emitted.continue).toBe(0);
  });

  it('emits download and continue from their buttons', () => {
    const { buttonByText, emitted } = render();
    buttonByText('Télécharger le modèle').click();
    buttonByText('Continuer').click();
    expect(emitted.download).toBe(1);
    expect(emitted.continue).toBe(1);
  });

  it('previews the headers for the chosen player count', () => {
    const { root, fixture } = render(2);
    const headers = () =>
      Array.from(root.querySelectorAll('.preview th')).map((th) => th.textContent?.trim());
    expect(headers()).toEqual([
      'Nom Équipe (optionnel)',
      'Nom Joueur 1',
      'Nom Club 1',
      'Nom Joueur 2',
      'Nom Club 2',
    ]);

    fixture.componentRef.setInput('playersCount', 1);
    fixture.detectChanges();
    expect(headers()).toHaveLength(3);
  });

  it('forwards player count changes', () => {
    const { fixture, emitted } = render();
    fixture.componentInstance.onPlayersCountChange(4);
    expect(emitted.count).toEqual([4]);
  });
});
