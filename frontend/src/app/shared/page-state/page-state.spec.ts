import { TestBed } from '@angular/core/testing';
import { PageState, PageStateTone } from './page-state';

function render(tone: PageStateTone, icon: string | null = null) {
  const fixture = TestBed.createComponent(PageState);
  fixture.componentRef.setInput('tone', tone);
  fixture.componentRef.setInput('message', 'Séance introuvable.');
  fixture.componentRef.setInput('icon', icon);
  fixture.detectChanges();
  return fixture;
}

describe('PageState', () => {
  it('announces an error as an alert, anything else as a status', () => {
    const section = (tone: PageStateTone) =>
      (render(tone).nativeElement as HTMLElement).querySelector('section')!;

    expect(section('error').getAttribute('role')).toBe('alert');
    TestBed.resetTestingModule();
    expect(section('loading').getAttribute('role')).toBe('status');
  });

  it('takes the icon of its tone unless one is given', () => {
    expect(render('loading').componentInstance.resolvedIcon()).toBe('progress_activity');
    TestBed.resetTestingModule();
    expect(render('empty', 'groups').componentInstance.resolvedIcon()).toBe('groups');
  });
});
