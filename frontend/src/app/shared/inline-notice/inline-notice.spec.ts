import { TestBed } from '@angular/core/testing';
import { InlineNotice } from './inline-notice';

function render(tone: 'info' | 'alert', icon: string | null = null) {
  const fixture = TestBed.createComponent(InlineNotice);
  fixture.componentRef.setInput('tone', tone);
  fixture.componentRef.setInput('icon', icon);
  fixture.detectChanges();
  return fixture.componentInstance;
}

describe('InlineNotice', () => {
  it('takes the icon of its tone', () => {
    expect(render('info').resolvedIcon()).toBe('info');
    expect(render('alert').resolvedIcon()).toBe('warning');
  });

  it('lets a given icon replace the one of the tone', () => {
    expect(render('info', 'visibility').resolvedIcon()).toBe('visibility');
  });
});
