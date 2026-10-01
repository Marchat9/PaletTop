import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { StatusPill, StatusPillTone } from './status-pill';

@Component({
  imports: [StatusPill],
  template: `<app-status-pill [tone]="tone" [size]="size">En cours</app-status-pill>`,
})
class HostComponent {
  tone: StatusPillTone = 'neutral';
  size: 'sm' | 'lg' = 'sm';
}

function setup(tone?: StatusPillTone, size?: 'sm' | 'lg') {
  const fixture = TestBed.createComponent(HostComponent);
  if (tone) {
    fixture.componentInstance.tone = tone;
  }
  if (size) {
    fixture.componentInstance.size = size;
  }
  fixture.detectChanges();
  return fixture.nativeElement.querySelector('.status-pill') as HTMLElement;
}

describe('StatusPill', () => {
  it('affiche le libellé qu’on lui projette', () => {
    expect(setup().textContent?.trim()).toBe('En cours');
  });

  it('porte son ton et sa taille en classes, sur lesquelles s’accroche le style', () => {
    const pill = setup('ongoing', 'lg');

    expect(pill.classList).toContain('ongoing');
    expect(pill.classList).toContain('lg');
  });

  it('reste neutre et compacte par défaut', () => {
    const pill = setup();

    expect(pill.classList).toContain('neutral');
    expect(pill.classList).toContain('sm');
  });
});
