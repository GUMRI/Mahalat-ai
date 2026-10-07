export type AccountingLanguage = 'ar' | 'en' | 'fr';
export type AccountClassification = 'current' | 'non_current' | null;
export type AccountingView =
  | 'overview'
  | 'accounts'
  | 'journals'
  | 'ledger'
  | 'balance-sheet'
  | 'profit-and-loss';

export interface LocalizedAccountName {
  ar: string;
  en: string;
  fr: string;
}

export interface ChartAccount {
  code: string;
  group_code: string;
  name: LocalizedAccountName;
  classification: AccountClassification;
  is_leaf: true;
  is_system: true;
}

export type AccountGroupName = 'assets' | 'liabilities' | 'equity' | 'revenue' | 'expenses';

export interface AccountGroup {
  code: string;
  nameKey: AccountGroupName;
}

export interface BranchScopedRecord {
  branch_id: string;
}

export interface AccountRecord
  extends Omit<ChartAccount, 'is_leaf' | 'is_system'>, BranchScopedRecord {
  template_version: number;
  parent_code: string | null;
  is_leaf: boolean;
  is_system: boolean;
  is_active?: boolean;
}

export interface JournalEntryRecord extends BranchScopedRecord {
  id: string;
  posted_at: string;
  description: string;
  reversal_of: string | null;
}

export interface JournalLineRecord extends BranchScopedRecord {
  journal_id: string;
  account_code: string;
  debit: number;
  credit: number;
}
