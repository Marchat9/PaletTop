import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Avatar } from './avatar';

function renderInitials(name: string, maxLetters?: 1 | 2): string {
  const fixture = TestBed.createComponent(Avatar);
  fixture.componentRef.setInput('name', name);
  if (maxLetters) {
    fixture.componentRef.setInput('maxLetters', maxLetters);
  }
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).textContent?.trim() ?? '';
}

describe('Avatar', () => {
  it('compose les initiales du prénom et du nom', () => {
    expect(renderInitials('Jean Dubois')).toBe('JD');
  });

  it("n'affiche qu'une lettre pour un nom en un seul mot", () => {
    expect(renderInitials('Marie')).toBe('M');
  });

  it('prend le premier et le dernier mot pour un nom composé', () => {
    expect(renderInitials('Jean-Pierre de La Motte')).toBe('JM');
  });

  it('se limite à une lettre quand maxLetters vaut 1', () => {
    expect(renderInitials('Jean Dubois', 1)).toBe('J');
  });

  it('tolère les espaces superflus', () => {
    expect(renderInitials('  hugo   vasseur  ')).toBe('HV');
  });

  it("retombe sur un point d'interrogation quand le nom est vide", () => {
    expect(renderInitials('   ')).toBe('?');
  });
});
