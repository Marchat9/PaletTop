import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IconFontService } from './icon-font.service';

export type IconVariant = 'outlined' | 'rounded';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [],
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  public readonly name = input.required<string>();
  public readonly variant = input<IconVariant>('outlined');
  public readonly fallback = input<string>('⟳');
  public readonly fallbackSpin = input<boolean>(true);
  public readonly iconClass = input<string>('');
  public readonly ariaHidden = input<boolean>(false);

  private readonly iconFont = inject(IconFontService);
  public readonly loaded = this.iconFont.loaded;

  public readonly fontClass = computed(() =>
    this.variant() === 'rounded' ? 'material-symbols-rounded' : 'material-symbols-outlined',
  );
}
