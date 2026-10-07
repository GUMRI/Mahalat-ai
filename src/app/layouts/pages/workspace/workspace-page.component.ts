import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  bagHandleOutline,
  cashOutline,
  cubeOutline,
  documentTextOutline,
  homeOutline,
  peopleOutline,
  receiptOutline,
  walletOutline,
} from 'ionicons/icons';
import { ShopDetails } from '../../../auth/service/shop-registration.service';
import { FirebaseAuthService } from '../../../firebase/firebase-auth.service';
import { AppLocale } from '../../../settings/i18n/i18n.config';
import { LangService } from '../../../settings/i18n/i18n.service';
import { ShopRegistrationService } from '../../../auth/service/shop-registration.service';
import { RotatingLogoComponent } from '../../components/rotating-logo/rotating-logo.component';
import { ProfileMenuComponent } from '../../components/profile-menu/profile-menu.component';
import { BusinessManagementFunctionService } from '../../../apps/business-management/service/business-management-functions.service';

export type WorkspaceSection = 'home' | 'workers' | 'settings' | 'pos';

const WORKSPACE_SECTIONS = new Set<WorkspaceSection>(['home', 'workers', 'settings', 'pos']);

@Component({
  selector: 'app-workspace-page',
  templateUrl: './workspace-page.component.html',
  styleUrls: ['./workspace-page.component.scss'],
  imports: [
    IonBadge,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCol,
    IonContent,
    IonGrid,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonRow,
    RouterLink,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar,
    TranslocoPipe,
    RotatingLogoComponent,
    ProfileMenuComponent,
  ],
})
export class WorkspacePageComponent implements OnInit {
  @Input() section: WorkspaceSection = 'home';

  readonly auth = inject(FirebaseAuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly lang = inject(LangService);
  private readonly registration = inject(ShopRegistrationService);
  private readonly businessManagementFunctions = inject(BusinessManagementFunctionService);
  readonly shop = signal<ShopDetails | null>(null);
  readonly isLoadingShop = signal(true);
  readonly shopLoadFailed = signal(false);
  readonly isSigningOut = signal(false);
  readonly signOutFailed = signal(false);
  readonly sectionTitle = computed(() =>
    this.section === 'home' ? 'Business Management' : `app.sections.${this.section}`,
  );
  readonly localeOptions = this.lang.locales;
  readonly functionCatalog = computed(() => this.businessManagementFunctions.listFunctions().slice(0, 4));
  readonly overviewMetrics: Array<{
    label: string;
    value: string | null;
    detail: string;
    direction: 'neutral' | 'up' | 'warning' | 'down';
    icon: typeof bagHandleOutline;
  }> = [
    {
      label: 'Sales this period',
      value: null,
      detail: 'No confirmed invoices yet',
      direction: 'neutral',
      icon: bagHandleOutline,
    },
    {
      label: 'Estimated profit',
      value: null,
      detail: 'Needs one confirmed sale or purchase',
      direction: 'neutral',
      icon: walletOutline,
    },
    {
      label: 'Customer dues',
      value: null,
      detail: 'No outstanding customer balances yet',
      direction: 'neutral',
      icon: peopleOutline,
    },
    {
      label: 'Stock alerts',
      value: null,
      detail: 'No stock warnings at the moment',
      direction: 'neutral',
      icon: cubeOutline,
    },
  ];
  readonly quickActions = [
    { label: 'Open POS', route: '/app/pos', icon: bagHandleOutline },
    { label: 'Record purchase', route: '/app/home', icon: documentTextOutline },
    { label: 'Log expense', route: '/app/home', icon: cashOutline },
    { label: 'Collect payment', route: '/app/home', icon: walletOutline },
  ] as const;
  readonly businessSections = [
    { label: 'Overview', icon: homeOutline },
    { label: 'Invoices', icon: receiptOutline },
    { label: 'Vouchers', icon: walletOutline },
    { label: 'Products', icon: cubeOutline },
    { label: 'Inventory', icon: documentTextOutline },
    { label: 'Parties', icon: peopleOutline },
    { label: 'Users', icon: peopleOutline },
    { label: 'Shifts', icon: cashOutline },
    { label: 'Shops', icon: bagHandleOutline },
  ] as const;
  readonly alerts: Array<{ title: string; detail: string; action: string }> = [];
  readonly shiftState = {
    label: 'No shift open',
    hint: 'Open a shift to begin cash tracking for the day.',
    action: 'Open shift',
  } as const;
  readonly icons = {
    sale: bagHandleOutline,
    product: cubeOutline,
    invoice: receiptOutline,
    customers: peopleOutline,
    expenses: cashOutline,
    money: walletOutline,
    purchase: documentTextOutline,
  };

  async ngOnInit(): Promise<void> {
    const routeSection = this.route.snapshot.data['section'];
    if (typeof routeSection === 'string' && WORKSPACE_SECTIONS.has(routeSection as WorkspaceSection)) {
      this.section = routeSection as WorkspaceSection;
    }

    const user = this.auth.user();
    if (!user) {
      this.isLoadingShop.set(false);
      this.shopLoadFailed.set(true);
      return;
    }
    try {
      this.shop.set(await this.registration.getShopDetails(user.uid));
    } catch {
      this.shopLoadFailed.set(true);
    } finally {
      this.isLoadingShop.set(false);
    }
  }

  setLocaleFromEvent(event: CustomEvent<{ value: unknown }>): void {
    const value = event.detail.value;
    if (typeof value === 'string' && this.isAppLocale(value)) {
      this.lang.setLocale(value);
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

  private isAppLocale(value: string): value is AppLocale {
    return this.localeOptions.some((locale) => locale.code === value);
  }
}
