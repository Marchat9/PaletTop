import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as QRCode from 'qrcode';
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

  // Rendered as inline SVG markup (not an <img src="data:..."> or toDataURL/toCanvas):
  // an <img>, even with a data: URI, is still decoded and painted asynchronously by the
  // browser's image pipeline, so window.print() (fired right after the next render)
  // could run before the QR code was actually painted, printing a blank/placeholder
  // image. Inline SVG has no separate loading/decoding step — it paints synchronously
  // as part of normal DOM layout, so it's guaranteed ready by the time afterNextRender's
  // callback (and thus window.print()) runs.
  //
  // Uses the callback form of toString(), not the promise form: 'qrcode's SVG renderer
  // is fully synchronous internally, but the promise form still defers resolution by a
  // microtask. The callback form invokes its callback synchronously, so this computed
  // can return the finished markup in the very same render pass.
  //
  // The generated markup is trusted: it comes entirely from the 'qrcode' library's own
  // fixed <svg><path/></svg> template built from the QR bit matrix - the input url is
  // never embedded as raw text in it, so there is no injection surface to sanitize away.
  protected readonly svgMarkup = computed<Nullable<SafeHtml>>(() => {
    const url = this.url();
    const size = this.size();

    let svg: Nullable<string> = null;
    QRCode.toString(url, { type: 'svg', margin: 1, width: size }, (error, result) => {
      if (!error) {
        svg = result;
      }
    });

    return svg ? this.sanitizer.bypassSecurityTrustHtml(svg) : null;
  });
}
