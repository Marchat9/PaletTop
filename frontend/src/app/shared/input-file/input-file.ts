import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';

type InputFileVariant = 'primary' | 'secondary' | 'tertiary' | 'error';

@Component({
  selector: 'app-input-file',
  imports: [Icon],
  templateUrl: './input-file.html',
  styleUrl: './input-file.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputFile {
  public readonly title = input.required<string>();
  public readonly variant = input<InputFileVariant>('primary');
  public readonly icon = input<string>();
  public readonly accept = input<string>('');
  public readonly disabled = input<boolean>(false);

  public readonly fileSelected = output<File>();

  private readonly fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  public onTrigger(): void {
    if (this.disabled()) {
      return;
    }

    this.fileInputRef()?.nativeElement.click();
  }

  public onChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (file) {
      this.fileSelected.emit(file);
    }
  }
}
