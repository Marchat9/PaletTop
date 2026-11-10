import { BurgerMenuItem } from 'src/app/shared/burger-menu/burger-menu.model';
import { NavItem } from './nav-item.entity';

/**
 * An entry is active when the current URL falls into one of its prefixes.
 *
 * The comparison is prefix-based and not strict on purpose: real URLs carry parameters
 * (`/player/training/1234/5678`), and the old equality on the first segment never lit the Player
 * and Admin entries up.
 */
export function isNavItemActive(item: NavItem, url: string): boolean {
  return longestMatchingPrefix(item, url) > 0;
}

/**
 * The entry with the most precise prefix wins: `/spectateur/training` (training) over `/spectateur`
 * (tournament), both matching a training spectator URL.
 */
export function findActiveNavKey(items: NavItem[], url: string): string | null {
  let activeKey: string | null = null;
  let activeLength = 0;
  for (const item of items) {
    const length = longestMatchingPrefix(item, url);
    if (length > activeLength) {
      activeKey = item.key;
      activeLength = length;
    }
  }
  return activeKey;
}

function longestMatchingPrefix(item: NavItem, url: string): number {
  const path = url.split(/[?#]/)[0];
  return Math.max(
    0,
    ...item.matchPrefixes
      .filter((prefix) => path === prefix || path.startsWith(`${prefix}/`))
      .map((prefix) => prefix.length),
  );
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
      name: 'À propos',
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
