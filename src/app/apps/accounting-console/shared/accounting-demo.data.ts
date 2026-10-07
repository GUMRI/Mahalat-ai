import { AccountingLanguage } from './accounting.models';

export interface AccountingDemoLine {
  account_code: string;
  debit: number;
  credit: number;
}

export interface AccountingDemoEntry {
  id: string;
  reference: string;
  posted_at: string;
  source: string;
  description: Record<AccountingLanguage, string>;
  lines: readonly AccountingDemoLine[];
}

export interface AccountingDemoDataset {
  version: 1;
  kind: 'demo';
  branch_id: string;
  currency: string;
  currency_minor_digits: number;
  entries: readonly AccountingDemoEntry[];
}

interface DemoEntryFixture extends Omit<AccountingDemoEntry, 'lines'> {
  lines: readonly {
    account_code: string;
    debit: number;
    credit: number;
  }[];
}

export const ACCOUNTING_DEMO_DATASET_ID = 'production-walkthrough-v1';

export const ACCOUNTING_DEMO_ENTRIES: readonly DemoEntryFixture[] = [
  {
    id: 'capital-contribution',
    reference: 'DEMO-2026-001',
    posted_at: '2026-10-01',
    source: 'ownerContribution',
    description: {
      ar: 'إيداع رأس مال المالك في الصندوق',
      en: 'Owner contributes opening capital to cash',
      fr: 'Apport initial du propriétaire en caisse',
    },
    lines: [
      { account_code: '1100', debit: 50_000, credit: 0 },
      { account_code: '3100', debit: 0, credit: 50_000 },
    ],
  },
  {
    id: 'cash-purchase',
    reference: 'DEMO-2026-002',
    posted_at: '2026-10-02',
    source: 'purchase',
    description: {
      ar: 'شراء بضاعة نقدًا',
      en: 'Inventory purchased for cash',
      fr: 'Achat de marchandises au comptant',
    },
    lines: [
      { account_code: '1400', debit: 20_000, credit: 0 },
      { account_code: '1100', debit: 0, credit: 20_000 },
    ],
  },
  {
    id: 'credit-purchase',
    reference: 'DEMO-2026-003',
    posted_at: '2026-10-02',
    source: 'purchase',
    description: {
      ar: 'شراء بضاعة على الحساب',
      en: 'Inventory purchased on supplier credit',
      fr: 'Achat de marchandises à crédit fournisseur',
    },
    lines: [
      { account_code: '1400', debit: 8_000, credit: 0 },
      { account_code: '2100', debit: 0, credit: 8_000 },
    ],
  },
  {
    id: 'cash-sale',
    reference: 'DEMO-2026-004',
    posted_at: '2026-10-03',
    source: 'sale',
    description: {
      ar: 'بيع نقدي',
      en: 'Cash sale',
      fr: 'Vente au comptant',
    },
    lines: [
      { account_code: '1100', debit: 28_000, credit: 0 },
      { account_code: '4100', debit: 0, credit: 28_000 },
    ],
  },
  {
    id: 'cash-sale-cost',
    reference: 'DEMO-2026-005',
    posted_at: '2026-10-03',
    source: 'costOfSale',
    description: {
      ar: 'تكلفة البضاعة المباعة للبيع النقدي',
      en: 'Cost of goods for the cash sale',
      fr: 'Coût des marchandises vendues au comptant',
    },
    lines: [
      { account_code: '5100', debit: 20_000, credit: 0 },
      { account_code: '1400', debit: 0, credit: 20_000 },
    ],
  },
  {
    id: 'credit-sale',
    reference: 'DEMO-2026-006',
    posted_at: '2026-10-04',
    source: 'sale',
    description: {
      ar: 'بيع آجل لعميل',
      en: 'Sale on customer credit',
      fr: 'Vente à crédit client',
    },
    lines: [
      { account_code: '1300', debit: 12_000, credit: 0 },
      { account_code: '4100', debit: 0, credit: 12_000 },
    ],
  },
  {
    id: 'credit-sale-cost',
    reference: 'DEMO-2026-007',
    posted_at: '2026-10-04',
    source: 'costOfSale',
    description: {
      ar: 'تكلفة البضاعة المباعة للبيع الآجل',
      en: 'Cost of goods for the credit sale',
      fr: 'Coût des marchandises vendues à crédit',
    },
    lines: [
      { account_code: '5100', debit: 7_000, credit: 0 },
      { account_code: '1400', debit: 0, credit: 7_000 },
    ],
  },
  {
    id: 'customer-collection',
    reference: 'DEMO-2026-008',
    posted_at: '2026-10-05',
    source: 'customerCollection',
    description: {
      ar: 'تحصيل جزء من دين عميل',
      en: 'Partial collection from a customer',
      fr: 'Encaissement partiel d’une créance client',
    },
    lines: [
      { account_code: '1100', debit: 6_000, credit: 0 },
      { account_code: '1300', debit: 0, credit: 6_000 },
    ],
  },
  {
    id: 'supplier-payment',
    reference: 'DEMO-2026-009',
    posted_at: '2026-10-05',
    source: 'supplierPayment',
    description: {
      ar: 'سداد جزء من مستحقات المورد',
      en: 'Partial payment to a supplier',
      fr: 'Paiement partiel au fournisseur',
    },
    lines: [
      { account_code: '2100', debit: 3_000, credit: 0 },
      { account_code: '1100', debit: 0, credit: 3_000 },
    ],
  },
  {
    id: 'rent-expense',
    reference: 'DEMO-2026-010',
    posted_at: '2026-10-06',
    source: 'operatingExpense',
    description: {
      ar: 'دفع إيجار المحل',
      en: 'Shop rent paid',
      fr: 'Paiement du loyer du magasin',
    },
    lines: [
      { account_code: '5300', debit: 3_000, credit: 0 },
      { account_code: '1100', debit: 0, credit: 3_000 },
    ],
  },
  {
    id: 'owner-withdrawal',
    reference: 'DEMO-2026-011',
    posted_at: '2026-10-06',
    source: 'ownerWithdrawal',
    description: {
      ar: 'سحب شخصي للمالك',
      en: 'Owner withdrawal',
      fr: 'Retrait personnel du propriétaire',
    },
    lines: [
      { account_code: '3200', debit: 2_000, credit: 0 },
      { account_code: '1100', debit: 0, credit: 2_000 },
    ],
  },
];
