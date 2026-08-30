import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { QrCode } from './qr-code';

describe('QrCode', () => {
  it('renders an inline <svg> synchronously, in the same render pass', () => {
    const fixture = TestBed.createComponent(QrCode);
    fixture.componentRef.setInput('url', 'https://palettop.example/player/ABCD/1234');
    fixture.detectChanges();

    const svg = fixture.nativeElement.querySelector('.qr-code svg');
    expect(svg).not.toBeNull();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.qr-code-placeholder')).toBeNull();
  });

  it('shows a placeholder when the QR code cannot be generated (e.g. empty url)', () => {
    const fixture = TestBed.createComponent(QrCode);
    fixture.componentRef.setInput('url', '');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.qr-code-placeholder')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
  });

  it('regenerates the QR code when the url input changes', () => {
    const fixture = TestBed.createComponent(QrCode);
    fixture.componentRef.setInput('url', 'https://palettop.example/a');
    fixture.detectChanges();
    const firstSvg = fixture.nativeElement.querySelector('.qr-code svg').outerHTML;

    fixture.componentRef.setInput('url', 'https://palettop.example/b');
    fixture.detectChanges();
    const secondSvg = fixture.nativeElement.querySelector('.qr-code svg').outerHTML;

    expect(secondSvg).not.toBe(firstSvg);
  });
});
