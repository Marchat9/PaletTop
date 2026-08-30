import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import QRCode from 'qrcode-svg';
import { Nullable } from 'src/app/models/nullable.model';

@Component({
  selector: 'app-qr-code',
  standalone: true,
  imports: [],
  templateUrl: './qr-code.html',
  styleUrl: './qr-code.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCode {
  readonly url = input.required<string>();
  readonly size = input<number>(160);
  readonly alt = input<string>('QR code');

  private readonly sanitizer = inject(DomSanitizer);
  public readonly svgMarkup = computed<Nullable<SafeHtml>>(() => {
    const url = this.url();
    const size = this.size();

    try {
      const svg = new QRCode({
        content: url,
        width: size,
        height: size,
        padding: 1,
        join: true,
        xmlDeclaration: false,
      }).svg();
      return this.sanitizer.bypassSecurityTrustHtml(svg);
    } catch {
      return null;
    }
  });
}
