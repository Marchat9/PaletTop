/** Final destination of a navigation entry. */
export interface NavItemChild {
  label: string;
  route: string;
  icon: string;
}

export interface NavItem {
  /** Stable identity of the entry, independent of its label and its route. */
  key: string;
  label: string;
  icon?: string;
  /** Direct destination. Absent when the entry opens a menu of sub-destinations. */
  route?: string;
  /** Sub-destinations (player, admin, spectator) shown in a menu. */
  children?: NavItemChild[];
  /**
   * URL prefixes that light the entry up. One entry covers several sections: "Tournoi" stays active
   * on the player view as well as on the admin and the spectator ones.
   */
  matchPrefixes: string[];
}
