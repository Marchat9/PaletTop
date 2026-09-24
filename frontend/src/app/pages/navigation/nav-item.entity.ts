/** Destination finale d'une entrée de navigation. */
export interface NavItemChild {
  label: string;
  route: string;
  icon: string;
}

export interface NavItem {
  /** Identité stable de l'entrée, indépendante du libellé et de la route. */
  key: string;
  label: string;
  icon?: string;
  /** Destination directe. Absente quand l'entrée ouvre un menu de sous-destinations. */
  route?: string;
  /** Sous-destinations (joueur, admin, spectateur) présentées dans un menu. */
  children?: NavItemChild[];
  /**
   * Préfixes d'URL qui allument l'entrée. Une même entrée couvre plusieurs sections :
   * « Tournoi » reste actif aussi bien sur la vue joueur que sur l'admin ou le spectateur.
   */
  matchPrefixes: string[];
}
