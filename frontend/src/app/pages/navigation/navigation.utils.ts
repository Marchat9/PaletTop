import { BurgerMenuItem } from 'src/app/shared/burger-menu/burger-menu.model';

export function generateBurgerMenuItem(
  theme: string,
  disabledKeys: string[],
  hiddenKeys: string[],
): BurgerMenuItem[] {
  return [
    {
      order: 1,
      icon: 'assets/images/github_' + (theme === 'dark' ? 'white' : 'black') + '.svg',
      name: 'GitHub',
      clickKey: 'GITHUB',
      disabled: disabledKeys.includes('GITHUB'),
      hidden: hiddenKeys.includes('GITHUB'),
    },
    {
      order: 2,
      icon: 'install_desktop',
      name: "Installer l'application",
      clickKey: 'PWA',
      disabled: disabledKeys.includes('PWA'),
      hidden: hiddenKeys.includes('PWA'),
    },
    {
      order: 3,
      icon: 'info',
      name: 'A propos',
      clickKey: 'ABOUT',
      disabled: disabledKeys.includes('ABOUT'),
      hidden: hiddenKeys.includes('ABOUT'),
    },
    {
      order: 99,
      icon: 'admin_panel_settings',
      name: 'Super Admin',
      clickKey: 'SUPER_ADMIN',
      disabled: disabledKeys.includes('SUPER_ADMIN'),
      hidden: hiddenKeys.includes('SUPER_ADMIN'),
    },
  ];
}
