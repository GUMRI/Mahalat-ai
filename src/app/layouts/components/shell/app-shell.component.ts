import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IonAccordion,
  IonAccordionGroup,
  IonAlert,
  IonButton,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuButton,
  IonMenuToggle,
  IonRouterOutlet,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  bagHandleOutline,
  calculatorOutline,
  homeOutline,
  notificationsOutline,
  settingsOutline,
  sparklesOutline,
  timeOutline,
} from 'ionicons/icons';
import { filter } from 'rxjs';
import { ShopDetails, ShopRegistrationService } from '../../../auth/service/shop-registration.service';
import { FirebaseAuthService } from '../../../firebase/firebase-auth.service';
import { ProfileMenuComponent } from '../profile-menu/profile-menu.component';
import { RotatingLogoComponent } from '../rotating-logo/rotating-logo.component';

interface NavigationChild {
  readonly label: string;
  readonly route: string;
}

interface NavigationItem extends NavigationChild {
  readonly icon: string;
  readonly children: readonly NavigationChild[];
}

const BUSINESS_MANAGEMENT_CHILDREN: readonly NavigationChild[] = [
  { label: 'app.businessManagement.navigation.overview', route: '/app/home' },
  { label: 'app.businessManagement.navigation.invoices', route: '/app/business-management/invoices' },
  { label: 'app.businessManagement.navigation.vouchers', route: '/app/business-management/vouchers' },
  { label: 'app.businessManagement.navigation.products', route: '/app/business-management/products' },
  { label: 'app.businessManagement.navigation.inventory', route: '/app/business-management/inventory' },
  { label: 'app.businessManagement.navigation.parties', route: '/app/business-management/parties' },
  { label: 'app.businessManagement.navigation.users', route: '/app/business-management/users' },
  { label: 'app.businessManagement.navigation.shifts', route: '/app/business-management/shifts' },
  { label: 'app.businessManagement.navigation.shops', route: '/app/business-management/shops' },
];

const ACCOUNTING_CHILDREN: readonly NavigationChild[] = [
  { label: 'app.accountingConsole.navigation.overview', route: '/app/accounting' },
  { label: 'app.accountingConsole.navigation.accounts', route: '/app/accounting/console/accounts' },
  { label: 'app.accountingConsole.navigation.journals', route: '/app/accounting/console/journals' },
  { label: 'app.accountingConsole.navigation.ledger', route: '/app/accounting/console/ledger' },
  { label: 'app.accountingConsole.navigation.balance-sheet', route: '/app/accounting/console/balance-sheet' },
  { label: 'app.accountingConsole.navigation.profit-and-loss', route: '/app/accounting/console/profit-and-loss' },
];

@Component({
  selector: 'app-shell',
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
  imports: [
    IonAccordion,
    IonAccordionGroup,
    IonAlert,
    IonButton,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonMenuButton,
    IonMenuToggle,
    IonRouterOutlet,
    IonTitle,
    IonToolbar,
    RouterLink,
    RouterLinkActive,
    TranslocoPipe,
    ProfileMenuComponent,
    RotatingLogoComponent,
  ],
})
export class AppShellComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(FirebaseAuthService);
  private readonly registration = inject(ShopRegistrationService);
  private readonly router = inject(Router);

  readonly shop = signal<ShopDetails | null>(null);
  readonly shopLoadFailed = signal(false);
  readonly isSigningOut = signal(false);
  readonly signOutFailed = signal(false);
  readonly titleKey = signal('app.businessManagement.overview.title');
  readonly subpageTabs = signal<readonly NavigationChild[]>([]);
  readonly subpageNavigationLabel = signal('app.navigation.home');
  readonly notificationsTriggerId = 'platform-notifications';
  readonly notificationsIcon = notificationsOutline;
  readonly shiftIcon = timeOutline;
  readonly navigationItems: readonly NavigationItem[] = [
    {
      label: 'app.navigation.home',
      route: '/app/home',
      icon: homeOutline,
      children: BUSINESS_MANAGEMENT_CHILDREN,
    },
    {
      label: 'app.navigation.accounting',
      route: '/app/accounting',
      icon: calculatorOutline,
      children: ACCOUNTING_CHILDREN,
    },
    { label: 'app.navigation.workers', route: '/app/workers', icon: sparklesOutline, children: [] },
    { label: 'app.navigation.pos', route: '/app/pos', icon: bagHandleOutline, children: [] },
    { label: 'app.navigation.settings', route: '/app/settings', icon: settingsOutline, children: [] },
  ];

  ngOnInit(): void {
    this.updateTitle();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.updateTitle());
    void this.loadShopDetails();
  }

  async loadShopDetails(): Promise<void> {
    this.shopLoadFailed.set(false);
    const user = this.auth.user();
    if (!user) {
      this.shopLoadFailed.set(true);
      return;
    }

    try {
      this.shop.set(await this.registration.getShopDetails(user.uid));
    } catch {
      this.shopLoadFailed.set(true);
    }
  }

  async signOut(): Promise<void> {
    this.isSigningOut.set(true);
    this.signOutFailed.set(false);
    try {
      await this.auth.signOut();
      await this.router.navigateByUrl('/');
    } catch {
      this.signOutFailed.set(true);
    } finally {
      this.isSigningOut.set(false);
    }
  }

  private updateTitle(): void {
    const path = this.router.url.split('?')[0];
    if (path === '/app/home' || path.startsWith('/app/business-management/')) {
      this.subpageTabs.set(BUSINESS_MANAGEMENT_CHILDREN);
      this.subpageNavigationLabel.set('app.navigation.home');
    } else if (path === '/app/accounting' || path.startsWith('/app/accounting/')) {
      this.subpageTabs.set(ACCOUNTING_CHILDREN);
      this.subpageNavigationLabel.set('app.navigation.accounting');
    } else {
      this.subpageTabs.set([]);
    }

    if (path.startsWith('/app/accounting/console/')) {
      const view = path.slice('/app/accounting/console/'.length);
      this.titleKey.set(`app.accountingConsole.views.${view}.title`);
      return;
    }

    const titleByPath: Record<string, string> = {
      '/app/accounting': 'app.accountingConsole.views.overview.title',
      '/app/business-management/invoices': 'app.businessManagement.pages.invoices.title',
      '/app/business-management/vouchers': 'app.businessManagement.pages.vouchers.title',
      '/app/business-management/products': 'app.businessManagement.pages.products.title',
      '/app/business-management/inventory': 'app.businessManagement.pages.inventory.title',
      '/app/business-management/parties': 'app.businessManagement.pages.parties.title',
      '/app/business-management/users': 'app.businessManagement.pages.users.title',
      '/app/business-management/shifts': 'app.businessManagement.pages.shifts.title',
      '/app/business-management/shops': 'app.businessManagement.pages.shops.title',
      '/app/workers': 'app.sections.workers',
      '/app/settings': 'app.sections.settings',
      '/app/pos': 'app.sections.pos',
    };
    this.titleKey.set(titleByPath[path] ?? 'app.businessManagement.overview.title');
  }
}
