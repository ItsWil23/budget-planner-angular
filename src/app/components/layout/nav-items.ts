import { NavItem } from '../../models/navitem';

/** Entrées de navigation communes à la sidebar (≥ 768px) et à la barre du bas (< 768px). */
export const NAV_ITEMS: readonly NavItem[] = [
  { labelKey: 'sidebar.nav.dashboard', path: '/dashboard', icon: 'dashboard' },
  {
    labelKey: 'sidebar.nav.budgetMensuel',
    shortLabelKey: 'bottomNav.budget',
    path: '/budget-mensuel',
    icon: 'budget',
  },
  { labelKey: 'sidebar.nav.transactions', path: '/transactions', icon: 'transactions' },
  { labelKey: 'sidebar.nav.categories', path: '/categories', icon: 'categories' },
  { labelKey: 'sidebar.nav.settings', path: '/settings', icon: 'settings' },
];
