import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  bagHandleOutline,
  cashOutline,
  documentTextOutline,
  peopleOutline,
  receiptOutline,
  walletOutline,
} from 'ionicons/icons';
import { BusinessManagementSectionPage } from '../shared/business-management-section.page';

@Component({
  selector: 'app-business-management-overview-page',
  templateUrl: './overview.page.html',
  styleUrl: './overview.page.scss',
  imports: [
    BusinessManagementSectionPage,
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon,
    RouterLink,
    TranslocoPipe,
  ],
})
export class BusinessManagementOverviewPage {
  readonly selectedPeriod = signal<'today' | 'week' | 'month'>('today');
  readonly periods = ['today', 'week', 'month'] as const;
  readonly metrics = [
    {
      key: 'sales',
      title: 'app.businessManagement.overview.metrics.sales',
      hint: 'app.businessManagement.overview.metrics.salesHint',
      trend: 'app.businessManagement.overview.metrics.trendUnavailable',
      route: '/app/business-management/invoices',
      icon: receiptOutline,
    },
    {
      key: 'profit',
      title: 'app.businessManagement.overview.metrics.profit',
      hint: 'app.businessManagement.overview.metrics.profitHint',
      trend: 'app.businessManagement.overview.metrics.trendUnavailable',
      route: '/app/business-management/invoices',
      icon: documentTextOutline,
    },
    {
      key: 'cash',
      title: 'app.businessManagement.overview.metrics.cash',
      hint: 'app.businessManagement.overview.metrics.cashHint',
      trend: 'app.businessManagement.overview.metrics.trendUnavailable',
      route: '/app/business-management/shifts',
      icon: cashOutline,
    },
    {
      key: 'receivables',
      title: 'app.businessManagement.overview.metrics.receivables',
      hint: 'app.businessManagement.overview.metrics.receivablesHint',
      trend: 'app.businessManagement.overview.metrics.trendUnavailable',
      route: '/app/business-management/parties',
      icon: peopleOutline,
    },
    {
      key: 'payables',
      title: 'app.businessManagement.overview.metrics.payables',
      hint: 'app.businessManagement.overview.metrics.payablesHint',
      trend: 'app.businessManagement.overview.metrics.trendUnavailable',
      route: '/app/business-management/parties',
      icon: walletOutline,
    },
    {
      key: 'expenses',
      title: 'app.businessManagement.overview.metrics.expenses',
      hint: 'app.businessManagement.overview.metrics.expensesHint',
      trend: 'app.businessManagement.overview.metrics.trendUnavailable',
      route: '/app/business-management/vouchers',
      icon: cashOutline,
    },
  ] as const;

  readonly icons = {
    bag: bagHandleOutline,
    cash: cashOutline,
    document: documentTextOutline,
    wallet: walletOutline,
  };

  setPeriod(period: string): void {
    if (period === 'today' || period === 'week' || period === 'month') {
      this.selectedPeriod.set(period);
    }
  }
}
