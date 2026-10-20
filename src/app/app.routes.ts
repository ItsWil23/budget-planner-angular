import { Routes } from '@angular/router';
import { Auth } from './pages/auth/auth';
import { BudgetMensuel } from './pages/budget-mensuel/budget-mensuel';
import { Landing } from './pages/landing/landing';
import { MainLayout } from './components/layout/main-layout/main-layout';
import { Dashboard } from './pages/dashboard/dashboard';
import { Categories } from './pages/categories/categories';
import { Transactions } from './pages/transactions/transactions';
import { Settings } from './pages/settings/settings';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: Landing },
  { path: 'auth/login', component: Auth },
  { path: 'auth/register', component: Auth },
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: 'dashboard',
        component: Dashboard,
        data: { titleKey: 'dashboard.title', monthScoped: true },
      },
      {
        path: 'transactions',
        component: Transactions,
        data: { titleKey: 'transactions.title', monthScoped: true },
      },
      {
        path: 'categories',
        component: Categories,
        data: { titleKey: 'categories.title', monthScoped: false },
      },
      {
        path: 'budget-mensuel',
        component: BudgetMensuel,
        data: { titleKey: 'budgetMensuel.title', monthScoped: true },
      },
      {
        path: 'settings',
        component: Settings,
        data: { titleKey: 'settings.title', monthScoped: false, topbarHiddenOutsideTablet: true },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
