import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IconFontService {
  public readonly loaded = signal(false);

  constructor() {
    if (!('fonts' in document)) {
      this.loaded.set(true);
      return;
    }

    Promise.all([
      document.fonts.load('1em "Material Symbols Outlined"'),
      document.fonts.load('1em "Material Symbols Rounded"'),
    ])
      .catch(() => [])
      .then(() => this.loaded.set(true));
  }
}
