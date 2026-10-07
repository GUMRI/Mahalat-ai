import { inject } from '@angular/core';
import { CanActivateFn, Routes, Router } from '@angular/router';
import { FirebaseAuthService } from './firebase/firebase-auth.service';
import { ShopRegistrationService } from './auth/service/shop-registration.service';

const loadAccountingConsole = () =>
  import('./apps/accounting-console/pages/accounting-console/accounting-console.page').then(
    (module) => module.AccountingConsolePage,
  );

const loadBusinessManagementOverview = () =>
  import('./apps/business-management/pages/overview/overview.page').then(
    (module) => module.BusinessManagementOverviewPage,
  );

const requireShopAccess: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(FirebaseAuthService);
  const registration = inject(ShopRegistrationService);
  await auth.waitUntilInitialized();

  const user = auth.user();
  if (!user) return router.parseUrl('/');

  try {
    const state = await registration.getAccessState(user.uid);
    return state === 'ready' ? true : router.parseUrl('/');
  } catch {
    return router.parseUrl('/');
  }
};

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./auth/pages/auth/auth.page').then((module) => module.AuthPage),
  },
  {
    path: 'app',
    canActivate: [requireShopAccess],
    loadComponent: () =>
      import('./layouts/components/shell/app-shell.component').then((module) => module.AppShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'home',
      },
      {
        path: 'home',
        data: { section: 'home' },
        loadComponent: loadBusinessManagementOverview,
      },
      {
        path: 'business-management/invoices',
        loadComponent: () =>
          import('./apps/business-management/pages/invoices/invoices.page').then(
            (module) => module.BusinessManagementInvoicesPage,
          ),
      },
      {
        path: 'business-management/vouchers',
        loadComponent: () =>
          import('./apps/business-management/pages/vouchers/vouchers.page').then(
            (module) => module.BusinessManagementVouchersPage,
          ),
      },
      {
        path: 'business-management/products',
        loadComponent: () =>
          import('./apps/business-management/pages/products/products.page').then(
            (module) => module.BusinessManagementProductsPage,
          ),
      },
      {
        path: 'business-management/inventory',
        loadComponent: () =>
          import('./apps/business-management/pages/inventory/inventory.page').then(
            (module) => module.BusinessManagementInventoryPage,
          ),
      },
      {
        path: 'business-management/parties',
        loadComponent: () =>
          import('./apps/business-management/pages/parties/parties.page').then(
            (module) => module.BusinessManagementPartiesPage,
          ),
      },
      {
        path: 'business-management/users',
        loadComponent: () =>
          import('./apps/business-management/pages/users/users.page').then(
            (module) => module.BusinessManagementUsersPage,
          ),
      },
      {
        path: 'business-management/shifts',
        loadComponent: () =>
          import('./apps/business-management/pages/shifts/shifts.page').then(
            (module) => module.BusinessManagementShiftsPage,
          ),
      },
      {
        path: 'business-management/shops',
        loadComponent: () =>
          import('./apps/business-management/pages/shops/shops.page').then(
            (module) => module.BusinessManagementShopsPage,
          ),
      },
      {
        path: 'accounting/console/accounts',
        data: { section: 'accounting', consoleView: 'accounts' },
        loadComponent: loadAccountingConsole,
      },
      {
        path: 'accounting/console/journals',
        data: { section: 'accounting', consoleView: 'journals' },
        loadComponent: loadAccountingConsole,
      },
      {
        path: 'accounting/console/ledger',
        data: { section: 'accounting', consoleView: 'ledger' },
        loadComponent: loadAccountingConsole,
      },
      {
        path: 'accounting/console/balance-sheet',
        data: { section: 'accounting', consoleView: 'balance-sheet' },
        loadComponent: loadAccountingConsole,
      },
      {
        path: 'accounting/console/profit-and-loss',
        data: { section: 'accounting', consoleView: 'profit-and-loss' },
        loadComponent: loadAccountingConsole,
      },
      {
        path: 'accounting',
        pathMatch: 'full',
        data: { section: 'accounting', consoleView: 'overview' },
        loadComponent: loadAccountingConsole,
      },
      {
        path: 'workers',
        data: { section: 'workers' },
        loadComponent: () =>
          import('./layouts/pages/workspace/workspace-page.component').then((module) => module.WorkspacePageComponent),
      },
      {
        path: 'settings',
        data: { section: 'settings' },
        loadComponent: () =>
          import('./layouts/pages/workspace/workspace-page.component').then((module) => module.WorkspacePageComponent),
      },
      {
        path: 'pos',
        data: { section: 'pos' },
        loadComponent: () =>
          import('./layouts/pages/workspace/workspace-page.component').then((module) => module.WorkspacePageComponent),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
