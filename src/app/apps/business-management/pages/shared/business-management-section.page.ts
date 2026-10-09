import { Component, input } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonIcon,
} from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  bagHandleOutline,
  cashOutline,
  cubeOutline,
  documentTextOutline,
  peopleOutline,
  receiptOutline,
  walletOutline,
} from 'ionicons/icons';

export type BusinessManagementPageKey =
  | 'overview'
  | 'invoices'
  | 'vouchers'
  | 'products'
  | 'inventory'
  | 'parties'
  | 'users'
  | 'shifts'
  | 'shops';

export interface BusinessManagementNavigationItem {
  readonly key: BusinessManagementPageKey;
  readonly label: string;
  readonly route: string;
  readonly icon: string;
}

export const BUSINESS_MANAGEMENT_NAVIGATION_ITEMS: readonly BusinessManagementNavigationItem[] = [
  { key: 'overview', label: 'app.businessManagement.navigation.overview', route: '/app/home', icon: bagHandleOutline },
  { key: 'invoices', label: 'app.businessManagement.navigation.invoices', route: '/app/business-management/invoices', icon: receiptOutline },
  { key: 'vouchers', label: 'app.businessManagement.navigation.vouchers', route: '/app/business-management/vouchers', icon: walletOutline },
  { key: 'products', label: 'app.businessManagement.navigation.products', route: '/app/business-management/products', icon: cubeOutline },
  { key: 'inventory', label: 'app.businessManagement.navigation.inventory', route: '/app/business-management/inventory', icon: documentTextOutline },
  { key: 'parties', label: 'app.businessManagement.navigation.parties', route: '/app/business-management/parties', icon: peopleOutline },
  { key: 'users', label: 'app.businessManagement.navigation.users', route: '/app/business-management/users', icon: peopleOutline },
  { key: 'shifts', label: 'app.businessManagement.navigation.shifts', route: '/app/business-management/shifts', icon: cashOutline },
  { key: 'shops', label: 'app.businessManagement.navigation.shops', route: '/app/business-management/shops', icon: bagHandleOutline },
];

const PAGE_CONTENT: Record<
  BusinessManagementPageKey,
  { readonly title: string; readonly description: string; readonly emptyMessage: string; readonly actionLabel: string; readonly actionRoute: string }
> = {
  overview: {
    title: 'app.businessManagement.overview.title',
    description: 'app.businessManagement.overview.description',
    emptyMessage: 'app.businessManagement.overview.activityNotice',
    actionLabel: 'app.businessManagement.overview.openPos',
    actionRoute: '/app/pos',
  },
  invoices: {
    title: 'app.businessManagement.pages.invoices.title',
    description: 'app.businessManagement.pages.invoices.description',
    emptyMessage: 'app.businessManagement.pages.invoices.empty',
    actionLabel: 'app.businessManagement.overview.newSale',
    actionRoute: '/app/pos',
  },
  vouchers: {
    title: 'app.businessManagement.pages.vouchers.title',
    description: 'app.businessManagement.pages.vouchers.description',
    emptyMessage: 'app.businessManagement.pages.vouchers.empty',
    actionLabel: 'app.businessManagement.overview.openPos',
    actionRoute: '/app/pos',
  },
  products: {
    title: 'app.businessManagement.pages.products.title',
    description: 'app.businessManagement.pages.products.description',
    emptyMessage: 'app.businessManagement.pages.products.empty',
    actionLabel: 'app.businessManagement.overview.openPos',
    actionRoute: '/app/pos',
  },
  inventory: {
    title: 'app.businessManagement.pages.inventory.title',
    description: 'app.businessManagement.pages.inventory.description',
    emptyMessage: 'app.businessManagement.pages.inventory.empty',
    actionLabel: 'app.businessManagement.navigation.products',
    actionRoute: '/app/business-management/products',
  },
  parties: {
    title: 'app.businessManagement.pages.parties.title',
    description: 'app.businessManagement.pages.parties.description',
    emptyMessage: 'app.businessManagement.pages.parties.empty',
    actionLabel: 'app.businessManagement.navigation.invoices',
    actionRoute: '/app/business-management/invoices',
  },
  users: {
    title: 'app.businessManagement.pages.users.title',
    description: 'app.businessManagement.pages.users.description',
    emptyMessage: 'app.businessManagement.pages.users.empty',
    actionLabel: 'app.businessManagement.navigation.overview',
    actionRoute: '/app/home',
  },
  shifts: {
    title: 'app.businessManagement.pages.shifts.title',
    description: 'app.businessManagement.pages.shifts.description',
    emptyMessage: 'app.businessManagement.pages.shifts.empty',
    actionLabel: 'app.businessManagement.overview.openPos',
    actionRoute: '/app/pos',
  },
  shops: {
    title: 'app.businessManagement.pages.shops.title',
    description: 'app.businessManagement.pages.shops.description',
    emptyMessage: 'app.businessManagement.pages.shops.empty',
    actionLabel: 'app.businessManagement.navigation.overview',
    actionRoute: '/app/home',
  },
};

@Component({
  selector: 'app-business-management-section-page',
  templateUrl: './business-management-section.page.html',
  styleUrl: './business-management-section.page.scss',
  imports: [
    IonButton,
    IonContent,
    IonIcon,
    RouterLink,
    TranslocoPipe,
  ],
})
export class BusinessManagementSectionPage {
  readonly page = input.required<BusinessManagementPageKey>();

  get pageIcon(): string {
    return BUSINESS_MANAGEMENT_NAVIGATION_ITEMS.find((item) => item.key === this.page())?.icon ?? bagHandleOutline;
  }

  get content() {
    return PAGE_CONTENT[this.page()];
  }
}
