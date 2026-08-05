import { TestBed } from '@angular/core/testing';
import { Icon } from './icon';
import { IconFontService } from './icon-font.service';

describe('Icon', () => {
  it('shows the fallback character while the icon font is not loaded', () => {
    const fixture = TestBed.createComponent(Icon);
    TestBed.inject(IconFontService).loaded.set(false);
    fixture.componentRef.setInput('name', 'print');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.icon-fallback')?.textContent).toBe('⟳');
    expect(fixture.nativeElement.querySelector('.material-symbols-outlined')).toBeNull();
  });

  it('shows the icon glyph once the font is loaded', () => {
    const fixture = TestBed.createComponent(Icon);
    TestBed.inject(IconFontService).loaded.set(true);
    fixture.componentRef.setInput('name', 'print');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.material-symbols-outlined')?.textContent).toBe(
      'print',
    );
    expect(fixture.nativeElement.querySelector('.icon-fallback')).toBeNull();
  });

  it('accepts a custom fallback character', () => {
    const fixture = TestBed.createComponent(Icon);
    TestBed.inject(IconFontService).loaded.set(false);
    fixture.componentRef.setInput('name', 'print');
    fixture.componentRef.setInput('fallback', '…');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.icon-fallback')?.textContent).toBe('…');
  });

  it('renders the rounded variant with the material-symbols-rounded class', () => {
    const fixture = TestBed.createComponent(Icon);
    TestBed.inject(IconFontService).loaded.set(true);
    fixture.componentRef.setInput('name', 'keyboard_arrow_up');
    fixture.componentRef.setInput('variant', 'rounded');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.material-symbols-rounded')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.material-symbols-outlined')).toBeNull();
  });

  it('preserves a consumer-supplied class on both the loaded icon and the fallback', () => {
    const fixture = TestBed.createComponent(Icon);
    const iconFont = TestBed.inject(IconFontService);
    fixture.componentRef.setInput('name', 'print');
    fixture.componentRef.setInput('iconClass', 'header-icon');

    iconFont.loaded.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.icon-fallback.header-icon')).not.toBeNull();

    iconFont.loaded.set(true);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.material-symbols-outlined.header-icon'),
    ).not.toBeNull();
  });

  it('does not set aria-hidden by default, but sets it when requested', () => {
    const fixture = TestBed.createComponent(Icon);
    TestBed.inject(IconFontService).loaded.set(true);
    fixture.componentRef.setInput('name', 'print');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('span')?.hasAttribute('aria-hidden')).toBe(false);

    fixture.componentRef.setInput('ariaHidden', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('span')?.getAttribute('aria-hidden')).toBe('true');
  });
});
