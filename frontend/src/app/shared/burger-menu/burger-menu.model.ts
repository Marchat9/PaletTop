export type BurgerMenuClickKey = 'GITHUB' | 'PWA' | 'ABOUT' | 'SUPER_ADMIN';

export interface BurgerMenuItem {
  order: number;
  icon: string;
  name: string;
  clickKey: BurgerMenuClickKey;
  disabled: boolean;
  hidden: boolean;
}
