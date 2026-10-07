import { AccountGroup, ChartAccount } from './accounting.models';

export const CHART_OF_ACCOUNTS_TEMPLATE_VERSION = 1;

export const ACCOUNT_GROUPS: readonly AccountGroup[] = [
  { code: '1000', nameKey: 'assets' },
  { code: '2000', nameKey: 'liabilities' },
  { code: '3000', nameKey: 'equity' },
  { code: '4000', nameKey: 'revenue' },
  { code: '5000', nameKey: 'expenses' },
];

export const CHART_OF_ACCOUNTS_TEMPLATE: readonly ChartAccount[] = [
  {
    code: '1100',
    group_code: '1000',
    name: {
      ar: 'الأصول - النقدية - الصندوق',
      en: 'Assets - Cash - Cash register',
      fr: 'Actifs - Trésorerie - Caisse',
    },
    classification: 'current',
    is_leaf: true,
    is_system: true,
  },
  {
    code: '1200',
    group_code: '1000',
    name: {
      ar: 'الأصول - النقدية - الحسابات البنكية',
      en: 'Assets - Cash - Bank accounts',
      fr: 'Actifs - Trésorerie - Comptes bancaires',
    },
    classification: 'current',
    is_leaf: true,
    is_system: true,
  },
  {
    code: '1300',
    group_code: '1000',
    name: {
      ar: 'الأصول - الذمم المدينة - العملاء',
      en: 'Assets - Receivables - Customers',
      fr: 'Actifs - Créances - Clients',
    },
    classification: 'current',
    is_leaf: true,
    is_system: true,
  },
  {
    code: '1400',
    group_code: '1000',
    name: {
      ar: 'الأصول - المخزون - البضائع',
      en: 'Assets - Inventory - Merchandise',
      fr: 'Actifs - Stocks - Marchandises',
    },
    classification: 'current',
    is_leaf: true,
    is_system: true,
  },
  {
    code: '1500',
    group_code: '1000',
    name: {
      ar: 'الأصول - المصاريف المقدمة - المصاريف المدفوعة مقدمًا',
      en: 'Assets - Prepayments - Prepaid expenses',
      fr: 'Actifs - Charges payées d’avance - Charges constatées d’avance',
    },
    classification: 'current',
    is_leaf: true,
    is_system: true,
  },
  {
    code: '1600',
    group_code: '1000',
    name: {
      ar: 'الأصول - الأصول الثابتة - المعدات والتجهيزات',
      en: 'Assets - Fixed assets - Equipment',
      fr: 'Actifs - Immobilisations - Matériel et équipements',
    },
    classification: 'non_current',
    is_leaf: true,
    is_system: true,
  },
  {
    code: '1700',
    group_code: '1000',
    name: {
      ar: 'الأصول - الأصول الثابتة - مجمع الاستهلاك',
      en: 'Assets - Fixed assets - Accumulated depreciation',
      fr: 'Actifs - Immobilisations - Amortissements cumulés',
    },
    classification: 'non_current',
    is_leaf: true,
    is_system: true,
  },
  {
    code: '2100',
    group_code: '2000',
    name: {
      ar: 'الخصوم - الذمم الدائنة - الموردون',
      en: 'Liabilities - Payables - Suppliers',
      fr: 'Passifs - Dettes - Fournisseurs',
    },
    classification: 'current',
    is_leaf: true,
    is_system: true,
  },
  {
    code: '2200',
    group_code: '2000',
    name: {
      ar: 'الخصوم - الضرائب - ضرائب مستحقة',
      en: 'Liabilities - Taxes - Taxes payable',
      fr: 'Passifs - Impôts - Impôts à payer',
    },
    classification: 'current',
    is_leaf: true,
    is_system: true,
  },
  {
    code: '2300',
    group_code: '2000',
    name: {
      ar: 'الخصوم - المصاريف المستحقة - الأجور المستحقة',
      en: 'Liabilities - Accrued expenses - Wages payable',
      fr: 'Passifs - Charges à payer - Salaires dus',
    },
    classification: 'current',
    is_leaf: true,
    is_system: true,
  },
  {
    code: '2400',
    group_code: '2000',
    name: {
      ar: 'الخصوم - القروض - قروض قصيرة الأجل',
      en: 'Liabilities - Loans - Short-term loans',
      fr: 'Passifs - Emprunts - Emprunts à court terme',
    },
    classification: 'current',
    is_leaf: true,
    is_system: true,
  },
  {
    code: '2500',
    group_code: '2000',
    name: {
      ar: 'الخصوم - القروض - قروض طويلة الأجل',
      en: 'Liabilities - Loans - Long-term loans',
      fr: 'Passifs - Emprunts - Emprunts à long terme',
    },
    classification: 'non_current',
    is_leaf: true,
    is_system: true,
  },
  {
    code: '3100',
    group_code: '3000',
    name: {
      ar: 'حقوق الملكية - رأس المال - رأس مال المالك',
      en: 'Equity - Capital - Owner capital',
      fr: 'Capitaux propres - Capital - Capital du propriétaire',
    },
    classification: null,
    is_leaf: true,
    is_system: true,
  },
  {
    code: '3200',
    group_code: '3000',
    name: {
      ar: 'حقوق الملكية - المسحوبات - مسحوبات المالك',
      en: 'Equity - Withdrawals - Owner withdrawals',
      fr: 'Capitaux propres - Retraits - Retraits du propriétaire',
    },
    classification: null,
    is_leaf: true,
    is_system: true,
  },
  {
    code: '3300',
    group_code: '3000',
    name: {
      ar: 'حقوق الملكية - الأرباح المحتجزة - الأرباح المرحلة',
      en: 'Equity - Retained earnings - Prior-year earnings',
      fr: 'Capitaux propres - Résultats reportés - Bénéfices antérieurs',
    },
    classification: null,
    is_leaf: true,
    is_system: true,
  },
  {
    code: '4100',
    group_code: '4000',
    name: {
      ar: 'الإيرادات - المبيعات - إيرادات المبيعات',
      en: 'Revenue - Sales - Sales revenue',
      fr: 'Produits - Ventes - Chiffre d’affaires',
    },
    classification: null,
    is_leaf: true,
    is_system: true,
  },
  {
    code: '4200',
    group_code: '4000',
    name: {
      ar: 'الإيرادات - مردودات المبيعات - مرتجعات المبيعات',
      en: 'Revenue - Sales returns - Sales returns',
      fr: 'Produits - Retours sur ventes - Retours sur ventes',
    },
    classification: null,
    is_leaf: true,
    is_system: true,
  },
  {
    code: '4300',
    group_code: '4000',
    name: {
      ar: 'الإيرادات - إيرادات أخرى - إيرادات متنوعة',
      en: 'Revenue - Other income - Miscellaneous income',
      fr: 'Produits - Autres produits - Produits divers',
    },
    classification: null,
    is_leaf: true,
    is_system: true,
  },
  {
    code: '5100',
    group_code: '5000',
    name: {
      ar: 'المصروفات - تكلفة المبيعات - تكلفة البضاعة المباعة',
      en: 'Expenses - Cost of sales - Cost of goods sold',
      fr: 'Charges - Coût des ventes - Coût des marchandises vendues',
    },
    classification: null,
    is_leaf: true,
    is_system: true,
  },
  {
    code: '5200',
    group_code: '5000',
    name: {
      ar: 'المصروفات - الأجور - أجور العاملين',
      en: 'Expenses - Wages - Staff wages',
      fr: 'Charges - Salaires - Salaires du personnel',
    },
    classification: null,
    is_leaf: true,
    is_system: true,
  },
  {
    code: '5300',
    group_code: '5000',
    name: {
      ar: 'المصروفات - الإيجار - إيجار المحل',
      en: 'Expenses - Rent - Shop rent',
      fr: 'Charges - Loyer - Loyer du magasin',
    },
    classification: null,
    is_leaf: true,
    is_system: true,
  },
  {
    code: '5400',
    group_code: '5000',
    name: {
      ar: 'المصروفات - المرافق - الماء والكهرباء والاتصالات',
      en: 'Expenses - Utilities - Water, electricity and communications',
      fr: 'Charges - Services publics - Eau, électricité et télécommunications',
    },
    classification: null,
    is_leaf: true,
    is_system: true,
  },
  {
    code: '5500',
    group_code: '5000',
    name: {
      ar: 'المصروفات - النقل والتوصيل - مصاريف النقل والتوصيل',
      en: 'Expenses - Transport and delivery - Delivery costs',
      fr: 'Charges - Transport et livraison - Frais de livraison',
    },
    classification: null,
    is_leaf: true,
    is_system: true,
  },
  {
    code: '5600',
    group_code: '5000',
    name: {
      ar: 'المصروفات - مصاريف تشغيلية أخرى - مصاريف متنوعة',
      en: 'Expenses - Other operating expenses - Miscellaneous expenses',
      fr: 'Charges - Autres charges d’exploitation - Charges diverses',
    },
    classification: null,
    is_leaf: true,
    is_system: true,
  },
];

export function validateChartOfAccountsTemplate(): void {
  if (CHART_OF_ACCOUNTS_TEMPLATE.length !== 24) {
    throw new Error('The standard chart of accounts template must contain exactly 24 accounts.');
  }

  const codes = new Set(CHART_OF_ACCOUNTS_TEMPLATE.map((account) => account.code));
  if (codes.size !== CHART_OF_ACCOUNTS_TEMPLATE.length) {
    throw new Error('The standard chart of accounts template contains duplicate account codes.');
  }

  for (const account of CHART_OF_ACCOUNTS_TEMPLATE) {
    const code = Number(account.code);
    const groupCode = Number(account.group_code);
    if (
      !ACCOUNT_GROUPS.some((group) => group.code === account.group_code) ||
      !/^\d{4}$/.test(account.code) ||
      code <= groupCode ||
      code >= groupCode + 1000 ||
      !account.is_leaf ||
      !account.is_system ||
      (account.group_code !== '1000' &&
        account.group_code !== '2000' &&
        account.classification !== null) ||
      (account.group_code === '1000' &&
        account.classification === null) ||
      (account.group_code === '2000' &&
        account.classification === null)
    ) {
      throw new Error(`Invalid account definition in the standard template: ${account.code}.`);
    }

    if (
      [account.name.ar, account.name.en, account.name.fr].some(
        (name) => name.split(' - ').length !== 3,
      )
    ) {
      throw new Error(`Account ${account.code} must use the three-part localized name format.`);
    }
  }

  for (const group of ACCOUNT_GROUPS) {
    if (!CHART_OF_ACCOUNTS_TEMPLATE.some((account) => account.group_code === group.code)) {
      throw new Error(`The standard chart of accounts template has no accounts for group ${group.code}.`);
    }
  }
}

validateChartOfAccountsTemplate();
