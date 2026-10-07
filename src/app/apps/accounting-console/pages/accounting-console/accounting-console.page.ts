import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonAccordion,
  IonAccordionGroup,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonNote,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  alertCircleOutline,
  businessOutline,
  calendarOutline,
  cardOutline,
  calculatorOutline,
  chevronForwardOutline,
  createOutline,
  documentTextOutline,
  folderOpenOutline,
  layersOutline,
  lockClosedOutline,
  downloadOutline,
  peopleOutline,
  trendingDownOutline,
  trendingUpOutline,
  walletOutline as balanceOutline,
  walletOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { AccountingConsoleDataService } from '../../service/accounting-console-data.service';
import {
  AccountGroup,
  AccountRecord,
  AccountingLanguage,
  AccountingView,
} from '../../shared/accounting.models';
import {
  AccountingDemoDataset,
  AccountingDemoEntry,
  AccountingDemoLine,
} from '../../shared/accounting-demo.data';
import { FirebaseAuthService } from '../../../../firebase/firebase-auth.service';
import { LangService } from '../../../../settings/i18n/i18n.service';

const ACCOUNTING_VIEWS = new Set<AccountingView>([
  'overview',
  'accounts',
  'journals',
  'ledger',
  'balance-sheet',
  'profit-and-loss',
]);

interface AccountSection {
  key: string;
  labelKey: string;
  icon: string;
  accounts: readonly AccountRecord[];
}

interface VisibleAccountGroup extends AccountGroup {
  accounts: readonly AccountRecord[];
  sections: readonly AccountSection[];
}

interface AccountingDemoSummary {
  assets: number;
  liabilities: number;
  equity: number;
  revenue: number;
  expenses: number;
  netResult: number;
  isBalanced: boolean;
}

interface AccountingDemoLedgerRow {
  entry: AccountingDemoEntry;
  line: AccountingDemoLine;
  balance: number;
}

@Component({
  selector: 'app-accounting-console',
  templateUrl: './accounting-console.page.html',
  styleUrl: './accounting-console.page.scss',
  imports: [
    IonAccordion,
    IonAccordionGroup,
    IonBadge,
    IonButton,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonModal,
    IonNote,
    IonSearchbar,
    IonSpinner,
    IonTitle,
    IonToolbar,
    RouterLink,
    TranslocoPipe,
  ],
})
export class AccountingConsolePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly data = inject(AccountingConsoleDataService);
  private readonly auth = inject(FirebaseAuthService);
  private readonly lang = inject(LangService);

  readonly view = this.readView(this.route.snapshot.data['consoleView']);
  readonly highlightedAccount = this.route.snapshot.queryParamMap.get('highlight');
  readonly accountFilter = this.route.snapshot.queryParamMap.get('account');
  readonly groups = this.data.accountGroups;
  readonly accounts = signal<readonly AccountRecord[]>([]);
  readonly isLoadingAccounts = signal(true);
  readonly accountLoadFailed = signal(false);
  readonly accountSearch = signal('');
  readonly isCustomAccountModalOpen = signal(false);
  readonly customAccountParent = signal<AccountRecord | null>(null);
  readonly customAccountName = signal({ ar: '', en: '', fr: '' });
  readonly customAccountError = signal<string | null>(null);
  readonly isSavingCustomAccount = signal(false);
  readonly demoData = signal<AccountingDemoDataset | null>(null);
  readonly isLoadingDemoData = signal(true);
  readonly isSeedingDemoData = signal(false);
  readonly demoDataError = signal<string | null>(null);
  readonly language = computed<AccountingLanguage>(() => {
    const code = this.lang.locale().slice(0, 2);
    return code === 'ar' || code === 'fr' ? code : 'en';
  });
  readonly visibleGroups = computed<readonly VisibleAccountGroup[]>(() => {
    const query = this.accountSearch().trim().toLocaleLowerCase();
    return this.groups
      .map((group) => {
        const accounts = this.accounts().filter((account) => account.group_code === group.code);
        const childrenByParent = new Map<string, AccountRecord[]>();
        return {
          ...group,
          accounts,
          sections: this.createSections(group, accounts, query, childrenByParent),
        };
      })
      .filter((group) => group.sections.length > 0 || !query);
  });
  readonly accountCount = computed(() => this.accounts().length);
  readonly demoBalances = computed(() => {
    const dataset = this.demoData();
    return dataset ? this.demoAccountBalances(dataset) : [];
  });
  readonly demoSummary = computed<AccountingDemoSummary | null>(() => {
    const dataset = this.demoData();
    if (!dataset) return null;
    const balances = this.demoBalances();
    const assets = this.groupBalance('1000', balances);
    const liabilities = this.groupBalance('2000', balances);
    const equityBeforeResult = this.groupBalance('3000', balances);
    const revenue = this.groupBalance('4000', balances);
    const expenses = this.groupBalance('5000', balances);
    const netResult = revenue - expenses;
    const equity = equityBeforeResult + netResult;
    return {
      assets,
      liabilities,
      equity,
      revenue,
      expenses,
      netResult,
      isBalanced: assets === liabilities + equity,
    };
  });
  readonly demoLedgerRows = computed<readonly AccountingDemoLedgerRow[]>(() => {
    const dataset = this.demoData();
    if (!dataset) return [];
    const runningBalances = new Map<string, number>();
    const rows: AccountingDemoLedgerRow[] = [];
    for (const entry of dataset.entries) {
      for (const line of entry.lines) {
        const account = this.accounts().find((item) => item.code === line.account_code);
        if (!account) continue;
        const movement = this.isDebitNature(account.group_code)
          ? line.debit - line.credit
          : line.credit - line.debit;
        const balance = (runningBalances.get(line.account_code) ?? 0) + movement;
        runningBalances.set(line.account_code, balance);
        rows.push({ entry, line, balance });
      }
    }
    const accountFilter = this.accountFilter;
    return accountFilter
      ? rows.filter((row) => row.line.account_code.startsWith(accountFilter))
      : rows;
  });
  readonly icons = {
    alert: alertCircleOutline,
    accounts: calculatorOutline,
    journals: documentTextOutline,
    ledger: walletOutline,
    lock: lockClosedOutline,
    download: downloadOutline,
    next: chevronForwardOutline,
    mainAccount: businessOutline,
    subgroup: layersOutline,
    detailedAccount: documentTextOutline,
    systemAccount: shieldCheckmarkOutline,
    customAccount: createOutline,
    balance: balanceOutline,
    expandableAccount: folderOpenOutline,
    assets: walletOutline,
    liabilities: cardOutline,
    equity: peopleOutline,
    revenue: trendingUpOutline,
    expenses: trendingDownOutline,
    fixedAssets: businessOutline,
    longTermLiabilities: calendarOutline,
  };
  readonly navigation: { view: AccountingView; path: string }[] = [
    { view: 'overview', path: '/app/accounting' },
    { view: 'accounts', path: '/app/accounting/console/accounts' },
    { view: 'journals', path: '/app/accounting/console/journals' },
    { view: 'ledger', path: '/app/accounting/console/ledger' },
    { view: 'balance-sheet', path: '/app/accounting/console/balance-sheet' },
    { view: 'profit-and-loss', path: '/app/accounting/console/profit-and-loss' },
  ];

  async ngOnInit(): Promise<void> {
    await this.loadAccounts();
    await this.loadDemoData();
  }

  async loadAccounts(): Promise<void> {
    this.isLoadingAccounts.set(true);
    this.accountLoadFailed.set(false);
    const user = this.auth.user();
    if (!user) {
      this.accountLoadFailed.set(true);
      this.isLoadingAccounts.set(false);
      return;
    }

    try {
      this.accounts.set(await this.data.getBranchAccounts(user.uid, 'main'));
    } catch {
      this.accountLoadFailed.set(true);
    } finally {
      this.isLoadingAccounts.set(false);
    }
  }

  async loadDemoData(): Promise<void> {
    this.isLoadingDemoData.set(true);
    this.demoDataError.set(null);
    const user = this.auth.user();
    if (!user) {
      this.demoData.set(null);
      this.demoDataError.set('app.accountingConsole.demo.loadError');
      this.isLoadingDemoData.set(false);
      return;
    }

    try {
      this.demoData.set(await this.data.getAccountingDemoData(user.uid, 'main'));
    } catch {
      this.demoData.set(null);
      this.demoDataError.set('app.accountingConsole.demo.loadError');
    } finally {
      this.isLoadingDemoData.set(false);
    }
  }

  async seedDemoData(): Promise<void> {
    const user = this.auth.user();
    if (!user || this.isSeedingDemoData() || this.demoData()) return;
    this.isSeedingDemoData.set(true);
    this.demoDataError.set(null);
    try {
      this.demoData.set(await this.data.seedAccountingDemoData(user.uid, 'main'));
    } catch {
      this.demoDataError.set('app.accountingConsole.demo.seedError');
    } finally {
      this.isSeedingDemoData.set(false);
    }
  }

  formatDemoAmount(minorUnits: number | null): string {
    const dataset = this.demoData();
    if (minorUnits === null || !dataset) return '—';
    const majorUnits = minorUnits / 10 ** dataset.currency_minor_digits;
    return new Intl.NumberFormat(this.lang.locale(), {
      style: 'currency',
      currency: dataset.currency,
      maximumFractionDigits: dataset.currency_minor_digits,
    }).format(majorUnits);
  }

  demoAccountBalance(accountCode: string): number | null {
    if (!this.demoData()) return null;
    const account = this.accounts().find((item) => item.code === accountCode);
    if (!account) return null;
    return this.demoBalances()
      .filter((balance) => balance.code.startsWith(accountCode))
      .reduce((total, balance) => total + balance.amount, 0);
  }

  demoGroupBalance(groupCode: string): number | null {
    if (!this.demoData()) return null;
    return this.groupBalance(groupCode, this.demoBalances());
  }

  demoSectionBalance(accounts: readonly AccountRecord[]): number | null {
    if (!this.demoData()) return null;
    return accounts
      .filter((account) => account.is_leaf)
      .reduce((total, account) => total + (this.demoAccountBalance(account.code) ?? 0), 0);
  }

  demoSourceKey(source: string): string {
    return `app.accountingConsole.demo.sources.${source}`;
  }

  accountName(accountCode: string): string {
    const account = this.accounts().find((item) => item.code === accountCode);
    const parts = account?.name[this.language()].split(' - ');
    return account
      ? (account.parent_code ? parts?.at(-1) : parts?.[2]) ?? accountCode
      : accountCode;
  }

  overviewMetric(key: string): number | null {
    if (
      key !== 'assets' &&
      key !== 'liabilities' &&
      key !== 'revenue' &&
      key !== 'expenses' &&
      key !== 'netResult'
    ) {
      return null;
    }
    return this.demoSummary()?.[key] ?? null;
  }

  accountDetailName(account: AccountRecord): string {
    const parts = account.name[this.language()].split(' - ');
    return account.parent_code ? parts.at(-1) ?? account.name[this.language()] : parts[2] ?? account.name[this.language()];
  }

  accountCountForGroup(groupCode: string): number {
    return this.accounts().filter((account) => account.group_code === groupCode).length;
  }

  accountDepth(account: AccountRecord): number {
    const accounts = this.accounts();
    let depth = 0;
    let parentCode = account.parent_code;
    while (parentCode) {
      const parent = accounts.find((candidate) => candidate.code === parentCode);
      if (!parent) break;
      depth += 1;
      parentCode = parent.parent_code;
    }
    return depth;
  }

  openCustomAccountModal(parent: AccountRecord): void {
    if (!parent.is_leaf) return;
    this.customAccountParent.set(parent);
    this.customAccountName.set({ ar: '', en: '', fr: '' });
    this.customAccountError.set(null);
    this.isCustomAccountModalOpen.set(true);
  }

  closeCustomAccountModal(): void {
    if (this.isSavingCustomAccount()) return;
    this.isCustomAccountModalOpen.set(false);
    this.customAccountParent.set(null);
    this.customAccountError.set(null);
  }

  setCustomAccountName(
    locale: AccountingLanguage,
    event: CustomEvent<{ value?: string | null }>,
  ): void {
    this.customAccountName.update((current) => ({
      ...current,
      [locale]: event.detail.value ?? '',
    }));
  }

  async saveCustomAccount(): Promise<void> {
    const parent = this.customAccountParent();
    const user = this.auth.user();
    const names = this.customAccountName();
    if (!parent || !user || this.isSavingCustomAccount()) return;
    if (Object.values(names).some((name) => !name.trim() || name.trim().length > 80)) {
      this.customAccountError.set('app.accountingConsole.customAccount.invalidName');
      return;
    }

    this.isSavingCustomAccount.set(true);
    this.customAccountError.set(null);
    try {
      await this.data.createDetailedAccount(user.uid, 'main', parent.code, names);
      this.isCustomAccountModalOpen.set(false);
      this.customAccountParent.set(null);
      await this.loadAccounts();
    } catch {
      this.customAccountError.set('app.accountingConsole.customAccount.saveError');
    } finally {
      this.isSavingCustomAccount.set(false);
    }
  }

  accountNatureIcon(account: AccountRecord): string {
    return account.is_leaf ? this.icons.detailedAccount : this.icons.expandableAccount;
  }

  private demoAccountBalances(dataset: AccountingDemoDataset): { code: string; amount: number }[] {
    const balances = new Map<string, { debit: number; credit: number }>();
    for (const entry of dataset.entries) {
      for (const line of entry.lines) {
        const current = balances.get(line.account_code) ?? { debit: 0, credit: 0 };
        current.debit += line.debit;
        current.credit += line.credit;
        balances.set(line.account_code, current);
      }
    }
    return Array.from(balances, ([code, amount]) => {
      const account = this.accounts().find((item) => item.code === code);
      return {
        code,
        amount: account && this.isDebitNature(account.group_code)
          ? amount.debit - amount.credit
          : amount.credit - amount.debit,
      };
    });
  }

  private groupBalance(
    groupCode: string,
    balances: readonly { code: string; amount: number }[],
  ): number {
    const accountCodes = new Set(
      this.accounts()
        .filter((account) => account.group_code === groupCode && account.is_leaf)
        .map((account) => account.code),
    );
    return balances
      .filter((balance) => accountCodes.has(balance.code))
      .reduce((total, balance) => total + balance.amount, 0);
  }

  private isDebitNature(groupCode: string): boolean {
    return groupCode === '1000' || groupCode === '5000';
  }

  groupNatureIcon(groupCode: string): string {
    switch (groupCode) {
      case '1000': return this.icons.assets;
      case '2000': return this.icons.liabilities;
      case '3000': return this.icons.equity;
      case '4000': return this.icons.revenue;
      case '5000': return this.icons.expenses;
      default: return this.icons.mainAccount;
    }
  }

  onAccountSearch(event: CustomEvent<{ value?: string | null }>): void {
    this.accountSearch.set(event.detail.value ?? '');
  }

  private readView(value: unknown): AccountingView {
    return typeof value === 'string' && ACCOUNTING_VIEWS.has(value as AccountingView)
      ? (value as AccountingView)
      : 'overview';
  }

  private createSections(
    group: AccountGroup,
    accounts: readonly AccountRecord[],
    query: string,
    childrenByParent: Map<string, AccountRecord[]>,
  ): readonly AccountSection[] {
    for (const account of accounts) {
      if (account.parent_code === null) continue;
      const children = childrenByParent.get(account.parent_code) ?? [];
      children.push(account);
      childrenByParent.set(account.parent_code, children);
    }

    const roots = accounts.filter(
      (account) =>
        account.parent_code === null &&
        this.accountTreeMatches(account, childrenByParent, query),
    );
    const bySection = new Map<string, AccountRecord[]>();
    const sectionNames = new Map<string, string>();
    const sectionIcons = new Map<string, string>();
    for (const root of roots) {
      let sectionKey: string;
      let labelKey: string;
      let icon = this.icons.subgroup;
      if (group.code === '1000' || group.code === '2000') {
        const classification = root.classification === 'non_current'
          ? 'nonCurrent'
          : 'current';
        const isAsset = group.code === '1000';
        sectionKey = `${classification}-${group.code}`;
        labelKey = `app.accountingConsole.sections.${classification}${isAsset ? 'Assets' : 'Liabilities'}`;
        icon = isAsset
          ? classification === 'current' ? this.icons.assets : this.icons.fixedAssets
          : classification === 'current' ? this.icons.liabilities : this.icons.longTermLiabilities;
      } else {
        const subgroup = root.name[this.language()].split(' - ')[1] ?? '';
        sectionKey = subgroup;
        labelKey = subgroup;
        sectionNames.set(sectionKey, subgroup);
      }
      sectionIcons.set(sectionKey, icon);
      const sectionAccounts = bySection.get(sectionKey) ?? [];
      this.flattenVisibleAccounts(root, childrenByParent, query, sectionAccounts);
      bySection.set(sectionKey, sectionAccounts);
    }

    return Array.from(bySection, ([key, sectionAccounts]) => ({
      key,
      labelKey: sectionNames.get(key) ?? key,
      icon: sectionIcons.get(key) ?? this.icons.subgroup,
      accounts: sectionAccounts,
    }));
  }

  private accountTreeMatches(
    account: AccountRecord,
    childrenByParent: Map<string, AccountRecord[]>,
    query: string,
  ): boolean {
    if (!query || `${account.code} ${account.name[this.language()]}`.toLocaleLowerCase().includes(query)) {
      return true;
    }
    return (childrenByParent.get(account.code) ?? []).some((child) =>
      this.accountTreeMatches(child, childrenByParent, query),
    );
  }

  private flattenVisibleAccounts(
    account: AccountRecord,
    childrenByParent: Map<string, AccountRecord[]>,
    query: string,
    output: AccountRecord[],
  ): void {
    if (this.accountTreeMatches(account, childrenByParent, query)) {
      output.push(account);
      for (const child of childrenByParent.get(account.code) ?? []) {
        this.flattenVisibleAccounts(child, childrenByParent, query, output);
      }
    }
  }
}
