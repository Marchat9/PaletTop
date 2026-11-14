import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Nullable } from 'src/app/models/nullable.model';
import { Button } from 'src/app/shared/button/button';
import { Icon } from 'src/app/shared/icon/icon';
import { InputFile } from 'src/app/shared/input-file/input-file';
import { pickImportFile } from '../../team-import.utils';

export interface TeamImportFileError {
  fileName: string;
  message: string;
  foundHeaders?: string[];
  expectedHeaders?: string[];
}

@Component({
  selector: 'app-team-import-file-step',
  imports: [Button, Icon, InputFile],
  templateUrl: './team-import-file-step.html',
  styleUrl: './team-import-file-step.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamImportFileStep {
  public readonly fileName = input<Nullable<string>>(null);
  public readonly error = input<Nullable<TeamImportFileError>>(null);
  public readonly isParsing = input<boolean>(false);
  public readonly maxTeams = input.required<number>();
  public readonly acceptedFormats = input.required<string>();

  public readonly fileSelected = output<File>();
  public readonly downloadTemplate = output<void>();

  public readonly isDragging = signal(false);
  public readonly dropError = signal<Nullable<string>>(null);

  private readonly isMobile = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 767.98px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  public readonly browseTitle = computed(() =>
    this.isMobile() ? 'Choisir le fichier' : 'Parcourir mes fichiers',
  );
  public readonly formatsLabel = computed(() =>
    this.acceptedFormats()
      .split(',')
      .map((ext) => ext.trim())
      .filter(Boolean)
      .join(' '),
  );

  public onFileSelected(file: File): void {
    this.dropError.set(null);
    this.fileSelected.emit(file);
  }

  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (!this.isParsing()) {
      this.isDragging.set(true);
    }
  }

  public onDragLeave(): void {
    this.isDragging.set(false);
  }

  public onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    if (this.isParsing()) {
      return;
    }
    const file = pickImportFile(event.dataTransfer?.files ?? [], this.acceptedFormats());
    if (!file) {
      this.dropError.set(`Format non pris en charge. Formats acceptés : ${this.formatsLabel()}.`);
      return;
    }
    this.onFileSelected(file);
  }
}
