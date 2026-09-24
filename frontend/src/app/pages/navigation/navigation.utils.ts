import { BurgerMenuItem } from 'src/app/shared/burger-menu/burger-menu.model';
import { NavItem } from './nav-item.entity';

/**
 * Une entrée est active si l'URL courante tombe dans l'un de ses préfixes.
 *
 * La comparaison est volontairement préfixée et non stricte : les URL réelles portent des
 * paramètres (`/player/training/1234/5678`), et l'ancienne comparaison d'égalité sur le
 * premier segment n'allumait jamais les entrées Joueur et Admin.
 */
export function isNavItemActive(item: NavItem, url: string): boolean {
  const path = url.split(/[?#]/)[0];

  return item.matchPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function findActiveNavKey(items: NavItem[], url: string): string | null {
  return items.find((item) => isNavItemActive(item, url))?.key ?? null;
}

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
