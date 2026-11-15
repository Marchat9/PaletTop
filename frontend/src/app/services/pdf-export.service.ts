import { Injectable } from '@angular/core';
import type { TDocumentDefinitions, TVirtualFileSystem } from 'pdfmake/interfaces';

/** The part of the pdfmake browser build this service uses. */
interface PdfMakeBrowser {
  addVirtualFileSystem(vfs: TVirtualFileSystem): void;
  createPdf(documentDefinitions: TDocumentDefinitions): {
    download(fileName?: string): Promise<void>;
  };
}

/** CommonJS modules come through a dynamic import either as the default export or as the namespace. */
interface CommonJsModule<T> {
  default?: T;
}

function unwrapCommonJs<T>(module: T & CommonJsModule<T>): T {
  return module.default ?? module;
}

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  private pdfMake: Promise<PdfMakeBrowser> | null = null;

  /**
   * Builds the PDF in the browser and hands it to the user as a download. pdfmake and its fonts
   * (about 1 MB) are only fetched on the first export.
   */
  public async download(
    documentDefinitions: TDocumentDefinitions,
    fileName: string,
  ): Promise<void> {
    const pdfMake = await this.loadPdfMake();
    await pdfMake.createPdf(documentDefinitions).download(fileName);
  }

  private loadPdfMake(): Promise<PdfMakeBrowser> {
    this.pdfMake ??= Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ])
      .then(([pdfMakeModule, fontsModule]) => {
        const pdfMake = unwrapCommonJs(
          pdfMakeModule as unknown as PdfMakeBrowser & CommonJsModule<PdfMakeBrowser>,
        );
        pdfMake.addVirtualFileSystem(
          unwrapCommonJs(
            fontsModule as unknown as TVirtualFileSystem & CommonJsModule<TVirtualFileSystem>,
          ),
        );
        return pdfMake;
      })
      .catch((error: unknown) => {
        // A failed chunk load (offline, new deployment) must not stick: the next click retries.
        this.pdfMake = null;
        throw error;
      });
    return this.pdfMake;
  }
}
