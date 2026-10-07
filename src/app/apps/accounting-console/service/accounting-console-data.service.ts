import { Injectable, inject } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { FIRESTORE } from '../../../firebase/firebase.providers';
import {
  AccountGroup,
  AccountRecord,
  ChartAccount,
  LocalizedAccountName,
} from '../shared/accounting.models';
import {
  ACCOUNTING_DEMO_DATASET_ID,
  ACCOUNTING_DEMO_ENTRIES,
  AccountingDemoDataset,
  AccountingDemoEntry,
} from '../shared/accounting-demo.data';
import {
  ACCOUNT_GROUPS,
  CHART_OF_ACCOUNTS_TEMPLATE,
  CHART_OF_ACCOUNTS_TEMPLATE_VERSION,
} from '../shared/chart-of-accounts.template';

@Injectable({ providedIn: 'root' })
export class AccountingConsoleDataService {
  private readonly firestore = inject(FIRESTORE);

  readonly accountGroups: readonly AccountGroup[] = ACCOUNT_GROUPS;

  async ensureChartOfAccounts(shopId: string, branchId: string): Promise<void> {
    const shopRef = doc(this.firestore, 'shops', shopId);
    const branchRef = doc(this.firestore, 'shops', shopId, 'branches', branchId);
    const accountRefs = CHART_OF_ACCOUNTS_TEMPLATE.map((account) =>
      doc(this.firestore, 'shops', shopId, 'branches', branchId, 'accounts', account.code),
    );

    await runTransaction(this.firestore, async (transaction) => {
      const [shopSnapshot, branchSnapshot] = await Promise.all([
        transaction.get(shopRef),
        transaction.get(branchRef),
      ]);
      if (!shopSnapshot.exists()) {
        throw new Error(`Cannot initialize accounts: shop ${shopId} does not exist.`);
      }
      if (!branchSnapshot.exists()) {
        throw new Error(`Cannot initialize accounts: branch ${branchId} does not exist.`);
      }

      const existingVersion = shopSnapshot.data()['accountTemplateVersion'];
      if (
        typeof existingVersion === 'number' &&
        existingVersion > CHART_OF_ACCOUNTS_TEMPLATE_VERSION
      ) {
        throw new Error(
          `Shop ${shopId} uses a newer chart of accounts template (${existingVersion}).`,
        );
      }

      const accountSnapshots = await Promise.all(
        accountRefs.map((accountRef) => transaction.get(accountRef)),
      );
      const missingIndexes: number[] = [];

      accountSnapshots.forEach((snapshot, index) => {
        if (!snapshot.exists()) {
          missingIndexes.push(index);
          return;
        }

        if (
          !this.matchesTemplateRecord(
            snapshot.data(),
            CHART_OF_ACCOUNTS_TEMPLATE[index],
            branchId,
          )
        ) {
          throw new Error(
            `Account ${CHART_OF_ACCOUNTS_TEMPLATE[index].code} conflicts with the standard template.`,
          );
        }
      });

      if (missingIndexes.length > 0 || existingVersion !== CHART_OF_ACCOUNTS_TEMPLATE_VERSION) {
        const updatedAt = serverTimestamp();
        for (const index of missingIndexes) {
          transaction.set(accountRefs[index], {
            ...CHART_OF_ACCOUNTS_TEMPLATE[index],
            branch_id: branchId,
            template_version: CHART_OF_ACCOUNTS_TEMPLATE_VERSION,
            created_at: updatedAt,
          });
        }
        transaction.update(shopRef, {
          accountTemplateVersion: CHART_OF_ACCOUNTS_TEMPLATE_VERSION,
        });
      }
    });
  }

  async getBranchAccounts(shopId: string, branchId: string): Promise<readonly AccountRecord[]> {
    await this.ensureChartOfAccounts(shopId, branchId);
    const accountsRef = collection(
      this.firestore,
      'shops',
      shopId,
      'branches',
      branchId,
      'accounts',
    );
    const snapshots = await getDocs(accountsRef);

    const accounts = snapshots.docs.map((snapshot) =>
      this.readAccountRecord(snapshot.id, snapshot.data(), branchId),
    );
    const resolvedAccounts = this.resolveAccountClassifications(accounts);
    this.validateAccountHierarchy(resolvedAccounts);
    resolvedAccounts.sort((left, right) => left.code.localeCompare(right.code));
    return resolvedAccounts;
  }

  async createDetailedAccount(
    shopId: string,
    branchId: string,
    parentCode: string,
    detailName: LocalizedAccountName,
  ): Promise<void> {
    for (const value of Object.values(detailName)) {
      const normalized = value.trim();
      if (!normalized || normalized.length > 80) {
        throw new Error('Account names must contain between 1 and 80 characters.');
      }
    }

    const accountsPath = ['shops', shopId, 'branches', branchId, 'accounts'] as const;
    const parentRef = doc(this.firestore, ...accountsPath, parentCode);
    const counterRef = doc(
      this.firestore,
      'shops',
      shopId,
      'branches',
      branchId,
      'account_code_counters',
      parentCode,
    );

    await runTransaction(this.firestore, async (transaction) => {
      const [parentSnapshot, counterSnapshot] = await Promise.all([
        transaction.get(parentRef),
        transaction.get(counterRef),
      ]);
      if (!parentSnapshot.exists()) {
        throw new Error(`Cannot create a detailed account: parent ${parentCode} does not exist.`);
      }

      const parent = this.readAccountRecord(
        parentSnapshot.id,
        parentSnapshot.data(),
        branchId,
      );
      if (!parent.is_leaf) {
        throw new Error(`Cannot create a detailed account under non-leaf account ${parentCode}.`);
      }

      const storedCounter = counterSnapshot.exists()
        ? counterSnapshot.data()['last_sequence']
        : 0;
      if (
        typeof storedCounter !== 'number' ||
        !Number.isSafeInteger(storedCounter) ||
        storedCounter < 0
      ) {
        throw new Error(`The account code sequence for ${parentCode} is invalid.`);
      }

      let sequence = storedCounter;
      let code = '';
      let accountRef = doc(this.firestore, ...accountsPath, `${parentCode}001`);
      let foundCode = false;
      for (let attempt = 0; attempt < 10_000; attempt += 1) {
        sequence += 1;
        code = `${parentCode}${String(sequence).padStart(3, '0')}`;
        accountRef = doc(this.firestore, ...accountsPath, code);
        if (!(await transaction.get(accountRef)).exists()) {
          foundCode = true;
          break;
        }
      }

      if (!foundCode) {
        throw new Error(`No available detailed account code remains under ${parentCode}.`);
      }

      const createdAt = serverTimestamp();
      transaction.update(parentRef, { is_leaf: false });
      transaction.set(counterRef, { last_sequence: sequence });
      transaction.set(accountRef, {
        code,
        group_code: parent.group_code,
        name: {
          ar: `${parent.name.ar} - ${detailName.ar.trim()}`,
          en: `${parent.name.en} - ${detailName.en.trim()}`,
          fr: `${parent.name.fr} - ${detailName.fr.trim()}`,
        },
        is_leaf: true,
        is_system: false,
        parent_code: parent.code,
        branch_id: branchId,
        template_version: CHART_OF_ACCOUNTS_TEMPLATE_VERSION,
        created_at: createdAt,
      });
    });
  }

  async getAccountingDemoData(
    shopId: string,
    branchId: string,
  ): Promise<AccountingDemoDataset | null> {
    const datasetRef = this.accountingDemoDatasetRef(shopId, branchId);
    const snapshot = await getDoc(datasetRef);
    if (!snapshot.exists()) return null;

    const accounts = await this.getBranchAccounts(shopId, branchId);
    return this.readAccountingDemoDataset(
      snapshot.data(),
      branchId,
      new Set(accounts.filter((account) => account.is_leaf).map((account) => account.code)),
    );
  }

  async seedAccountingDemoData(
    shopId: string,
    branchId: string,
  ): Promise<AccountingDemoDataset> {
    const [accounts, shopSnapshot] = await Promise.all([
      this.getBranchAccounts(shopId, branchId),
      getDoc(doc(this.firestore, 'shops', shopId)),
    ]);
    if (!shopSnapshot.exists()) {
      throw new Error(`Cannot seed accounting demo data: shop ${shopId} does not exist.`);
    }

    const currency = shopSnapshot.data()['currency'];
    if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) {
      throw new Error(`Cannot seed accounting demo data: shop ${shopId} has no valid currency.`);
    }
    const currencyMinorDigits = new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
    }).resolvedOptions().maximumFractionDigits;
    if (
      typeof currencyMinorDigits !== 'number' ||
      !Number.isInteger(currencyMinorDigits) ||
      currencyMinorDigits < 0 ||
      currencyMinorDigits > 4
    ) {
      throw new Error(`Currency ${currency} has an unsupported minor-unit precision.`);
    }
    const accountsByCode = new Map(accounts.map((account) => [account.code, account]));
    const entries = ACCOUNTING_DEMO_ENTRIES.map((fixture): AccountingDemoEntry => ({
      ...fixture,
      lines: fixture.lines.map((line) => {
        const account = this.resolveDemoLeafAccount(line.account_code, accountsByCode, accounts);
        const scale = 10 ** currencyMinorDigits;
        const debit = line.debit * scale;
        const credit = line.credit * scale;
        if (!Number.isSafeInteger(debit) || !Number.isSafeInteger(credit)) {
          throw new Error(`Demo entry ${fixture.id} exceeds the supported currency amount.`);
        }
        return { account_code: account.code, debit, credit };
      }),
    }));
    const dataset: AccountingDemoDataset = {
      version: 1,
      kind: 'demo',
      branch_id: branchId,
      currency,
      currency_minor_digits: currencyMinorDigits,
      entries,
    };
    const datasetRef = this.accountingDemoDatasetRef(shopId, branchId);
    const leafCodes = new Set(accounts.filter((account) => account.is_leaf).map((account) => account.code));
    const demoAccountRefs = Array.from(
      new Set(entries.flatMap((entry) => entry.lines.map((line) => line.account_code))),
      (accountCode) =>
        doc(
          this.firestore,
          'shops',
          shopId,
          'branches',
          branchId,
          'accounts',
          accountCode,
        ),
    );

    return runTransaction(this.firestore, async (transaction) => {
      const [existingSnapshot, accountSnapshots] = await Promise.all([
        transaction.get(datasetRef),
        Promise.all(demoAccountRefs.map((accountRef) => transaction.get(accountRef))),
      ]);
      for (const accountSnapshot of accountSnapshots) {
        if (
          !accountSnapshot.exists() ||
          accountSnapshot.data()['branch_id'] !== branchId ||
          accountSnapshot.data()['is_leaf'] !== true
        ) {
          throw new Error(
            `Demo account ${accountSnapshot.id} is missing or is no longer a postable leaf.`,
          );
        }
      }

      if (existingSnapshot.exists()) {
        return this.readAccountingDemoDataset(
          existingSnapshot.data(),
          branchId,
          leafCodes,
        );
      }

      this.readAccountingDemoDataset(dataset, branchId, leafCodes);
      transaction.set(datasetRef, {
        ...dataset,
        seeded_at: serverTimestamp(),
      });
      return dataset;
    });
  }

  private accountingDemoDatasetRef(shopId: string, branchId: string) {
    return doc(
      this.firestore,
      'shops',
      shopId,
      'branches',
      branchId,
      'accounting_demo_datasets',
      ACCOUNTING_DEMO_DATASET_ID,
    );
  }

  private resolveDemoLeafAccount(
    accountCode: string,
    accountsByCode: ReadonlyMap<string, AccountRecord>,
    accounts: readonly AccountRecord[],
  ): AccountRecord {
    const account = accountsByCode.get(accountCode);
    if (!account) {
      throw new Error(`Demo data references missing chart account ${accountCode}.`);
    }
    if (account.is_leaf) return account;

    const childAccounts = accounts
      .filter((candidate) => candidate.parent_code === account.code)
      .sort((left, right) => left.code.localeCompare(right.code));
    for (const child of childAccounts) {
      const leaf = this.resolveDemoLeafAccount(child.code, accountsByCode, accounts);
      if (leaf.is_leaf) return leaf;
    }
    throw new Error(`Demo account ${accountCode} has no postable leaf account.`);
  }

  private readAccountingDemoDataset(
    input: unknown,
    branchId: string,
    leafAccountCodes: ReadonlySet<string>,
  ): AccountingDemoDataset {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new Error('Stored accounting demo data has an invalid format.');
    }
    const value = input as Record<string, unknown>;
    if (
      value['version'] !== 1 ||
      value['kind'] !== 'demo' ||
      value['branch_id'] !== branchId ||
      typeof value['currency'] !== 'string' ||
      !/^[A-Z]{3}$/.test(value['currency']) ||
      typeof value['currency_minor_digits'] !== 'number' ||
      !Number.isInteger(value['currency_minor_digits']) ||
      value['currency_minor_digits'] < 0 ||
      value['currency_minor_digits'] > 4 ||
      !Array.isArray(value['entries'])
    ) {
      throw new Error('Stored accounting demo data has an invalid format.');
    }

    const entries = value['entries'].map((entry, index) =>
      this.readAccountingDemoEntry(entry, index, leafAccountCodes),
    );
    if (entries.length === 0) {
      throw new Error('Stored accounting demo data must contain journal examples.');
    }

    return {
      version: 1,
      kind: 'demo',
      branch_id: branchId,
      currency: value['currency'],
      currency_minor_digits: value['currency_minor_digits'],
      entries,
    };
  }

  private readAccountingDemoEntry(
    value: unknown,
    index: number,
    leafAccountCodes: ReadonlySet<string>,
  ): AccountingDemoEntry {
    if (typeof value !== 'object' || value === null) {
      throw new Error(`Demo journal example ${index} is invalid.`);
    }
    const entry = value as Record<string, unknown>;
    if (
      typeof entry['id'] !== 'string' ||
      typeof entry['reference'] !== 'string' ||
      typeof entry['posted_at'] !== 'string' ||
      typeof entry['source'] !== 'string' ||
      !this.isLocalizedName(entry['description']) ||
      !Array.isArray(entry['lines']) ||
      entry['lines'].length < 2
    ) {
      throw new Error(`Demo journal example ${index} is invalid.`);
    }

    let totalDebit = 0;
    let totalCredit = 0;
    const lines = entry['lines'].map((lineValue, lineIndex) => {
      if (typeof lineValue !== 'object' || lineValue === null) {
        throw new Error(`Demo journal example ${entry['id']} line ${lineIndex} is invalid.`);
      }
      const line = lineValue as Record<string, unknown>;
      if (
        typeof line['account_code'] !== 'string' ||
        !leafAccountCodes.has(line['account_code']) ||
        typeof line['debit'] !== 'number' ||
        !Number.isSafeInteger(line['debit']) ||
        line['debit'] < 0 ||
        typeof line['credit'] !== 'number' ||
        !Number.isSafeInteger(line['credit']) ||
        line['credit'] < 0 ||
        (line['debit'] === 0) === (line['credit'] === 0)
      ) {
        throw new Error(`Demo journal example ${entry['id']} line ${lineIndex} is invalid.`);
      }
      totalDebit += line['debit'];
      totalCredit += line['credit'];
      return {
        account_code: line['account_code'],
        debit: line['debit'],
        credit: line['credit'],
      };
    });
    if (
      !Number.isSafeInteger(totalDebit) ||
      !Number.isSafeInteger(totalCredit) ||
      totalDebit !== totalCredit
    ) {
      throw new Error(`Demo journal example ${entry['id']} is not balanced.`);
    }

    return {
      id: entry['id'],
      reference: entry['reference'],
      posted_at: entry['posted_at'],
      source: entry['source'],
      description: entry['description'],
      lines,
    };
  }

  private matchesTemplateRecord(
    value: Record<string, unknown>,
    account: ChartAccount,
    branchId: string,
  ): boolean {
    return (
      value['code'] === account.code &&
      value['group_code'] === account.group_code &&
      value['branch_id'] === branchId &&
      value['template_version'] === CHART_OF_ACCOUNTS_TEMPLATE_VERSION &&
      value['classification'] === account.classification &&
      typeof value['is_leaf'] === 'boolean' &&
      value['is_system'] === true &&
      (value['parent_code'] === undefined || value['parent_code'] === null) &&
      this.matchesLocalizedName(value['name'], account.name)
    );
  }

  private readAccountRecord(
    id: string,
    value: Record<string, unknown>,
    branchId: string,
  ): AccountRecord {
    const templateAccount = CHART_OF_ACCOUNTS_TEMPLATE.find((account) => account.code === id);
    if (templateAccount) {
      if (value['code'] !== id || !this.matchesTemplateRecord(value, templateAccount, branchId)) {
        throw new Error(`Stored chart account ${id} is invalid or belongs to another branch.`);
      }

      return {
        ...templateAccount,
        branch_id: branchId,
        template_version: CHART_OF_ACCOUNTS_TEMPLATE_VERSION,
        parent_code: null,
        is_leaf: value['is_leaf'] === true,
        is_system: true,
      };
    }

    const parentCode = value['parent_code'];
    if (
      value['code'] !== id ||
      value['branch_id'] !== branchId ||
      value['template_version'] !== CHART_OF_ACCOUNTS_TEMPLATE_VERSION ||
      typeof parentCode !== 'string' ||
      !id.startsWith(parentCode) ||
      typeof value['group_code'] !== 'string' ||
      !ACCOUNT_GROUPS.some((group) => group.code === value['group_code']) ||
      typeof value['is_leaf'] !== 'boolean' ||
      value['is_system'] !== false ||
      !this.isLocalizedName(value['name'])
    ) {
      throw new Error(`Stored detailed account ${id} is invalid or belongs to another branch.`);
    }

    return {
      code: id,
      group_code: value['group_code'],
      name: value['name'],
      classification: null,
      branch_id: branchId,
      template_version: CHART_OF_ACCOUNTS_TEMPLATE_VERSION,
      parent_code: parentCode,
      is_leaf: value['is_leaf'],
      is_system: false,
    };
  }

  private validateAccountHierarchy(accounts: readonly AccountRecord[]): void {
    const accountsByCode = new Map(accounts.map((account) => [account.code, account]));
    const parentCodes = new Set(
      accounts.flatMap((account) => account.parent_code ? [account.parent_code] : []),
    );
    for (const account of accounts) {
      if (account.parent_code === null) continue;
      const parent = accountsByCode.get(account.parent_code);
      if (
        !parent ||
        parent.is_leaf ||
        parent.group_code !== account.group_code ||
        parent.classification !== account.classification
      ) {
        throw new Error(`Detailed account ${account.code} has an invalid parent relationship.`);
      }
    }

    for (const account of accounts) {
      if (account.is_leaf === parentCodes.has(account.code)) {
        throw new Error(`Account ${account.code} has an inconsistent leaf status.`);
      }
    }
  }

  private resolveAccountClassifications(
    accounts: readonly AccountRecord[],
  ): AccountRecord[] {
    const accountsByCode = new Map(accounts.map((account) => [account.code, account]));
    const classifications = new Map<string, AccountRecord['classification']>();
    const resolving = new Set<string>();
    const resolve = (account: AccountRecord): AccountRecord['classification'] => {
      const resolved = classifications.get(account.code);
      if (resolved !== undefined || classifications.has(account.code)) return resolved ?? null;
      if (resolving.has(account.code)) {
        throw new Error(`Detailed account hierarchy contains a cycle at ${account.code}.`);
      }

      resolving.add(account.code);
      try {
        const classification = account.parent_code
          ? (() => {
              const parentCode = account.parent_code;
              const parent = parentCode ? accountsByCode.get(parentCode) : undefined;
              if (!parent) {
                throw new Error(`Detailed account ${account.code} has no parent account.`);
              }
              return resolve(parent);
            })()
          : account.classification;
        classifications.set(account.code, classification);
        return classification;
      } finally {
        resolving.delete(account.code);
      }
    };

    return accounts.map((account) => ({
      ...account,
      classification: resolve(account),
    }));
  }

  private matchesLocalizedName(value: unknown, expected: LocalizedAccountName): boolean {
    return (
      this.isLocalizedName(value) &&
      value.ar === expected.ar &&
      value.en === expected.en &&
      value.fr === expected.fr
    );
  }

  private isLocalizedName(value: unknown): value is LocalizedAccountName {
    if (typeof value !== 'object' || value === null) return false;
    const name = value as Record<string, unknown>;
    return (
      typeof name['ar'] === 'string' &&
      typeof name['en'] === 'string' &&
      typeof name['fr'] === 'string'
    );
  }
}
