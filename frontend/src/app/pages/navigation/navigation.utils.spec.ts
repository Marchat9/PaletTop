import { describe, expect, it } from 'vitest';
import { findActiveNavKey, isNavItemActive } from './navigation.utils';
import { NavItem } from './nav-item.entity';

const items: NavItem[] = [
  { key: 'home', label: 'Accueil', route: '/accueil', matchPrefixes: ['/accueil'] },
  {
    key: 'tournament',
    label: 'Tournoi',
    matchPrefixes: [
      '/player/tournament',
      '/admin/tournament',
      '/admin/tournament-creation',
      '/spectateur',
    ],
    children: [{ label: 'Joueur', route: '/player/tournament', icon: 'person' }],
  },
  {
    key: 'training',
    label: 'Entraînement',
    matchPrefixes: ['/player/training', '/admin/training', '/admin/training-creation'],
    children: [{ label: 'Joueur', route: '/player/training', icon: 'person' }],
  },
  {
    key: 'friendly',
    label: 'Amical',
    route: '/friendly-match',
    matchPrefixes: ['/friendly-match'],
  },
];

describe('navigation.utils', () => {
  describe('isNavItemActive', () => {
    it('reconnaît une URL portant des paramètres', () => {
      // Regression: the old comparison reduced the URL to its first segment then compared it for
      // strict equality - no player or admin entry ever lit up.
      expect(isNavItemActive(items[2], '/player/training/1234/5678')).toBe(true);
      expect(isNavItemActive(items[1], '/admin/tournament/LAITON-2026')).toBe(true);
    });

    it('ne confond pas deux univers partageant le même premier segment', () => {
      expect(isNavItemActive(items[1], '/player/training/1234/5678')).toBe(false);
      expect(isNavItemActive(items[2], '/admin/tournament/LAITON-2026')).toBe(false);
    });

    it("ne déborde pas d'un préfixe sur une route voisine", () => {
      // `/admin/training-creation` must not be caught by the `/admin/training` prefix through a too
      // permissive string match - it has its own prefix.
      expect(isNavItemActive(items[2], '/admin/training-creation')).toBe(true);
      expect(isNavItemActive(items[1], '/admin/training-creation')).toBe(false);
    });

    it('ignore les paramètres de requête et les ancres', () => {
      expect(isNavItemActive(items[0], '/accueil?from=qr')).toBe(true);
      expect(isNavItemActive(items[3], '/friendly-match#score')).toBe(true);
    });
  });

  describe('findActiveNavKey', () => {
    it('rattache le spectateur à l’univers tournoi', () => {
      expect(findActiveNavKey(items, '/spectateur/LAITON-2026')).toBe('tournament');
    });

    it('rattache la séance et sa création à l’univers entraînement', () => {
      expect(findActiveNavKey(items, '/admin/training/LAITON/session/1234')).toBe('training');
      expect(findActiveNavKey(items, '/admin/training/LAITON/session-creation')).toBe('training');
    });

    it('ne renvoie aucune entrée pour une URL hors navigation', () => {
      expect(findActiveNavKey(items, '/super-admin')).toBeNull();
    });
  });
});
