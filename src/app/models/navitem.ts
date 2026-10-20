export type NavIcon = 'dashboard' | 'transactions' | 'categories' | 'budget' | 'settings';

export interface NavItem {
  labelKey: string;
  /** Libellé plus court pour la barre du bas ; à défaut, `labelKey` est utilisé. */
  shortLabelKey?: string;
  path: string;
  icon: NavIcon;
}
