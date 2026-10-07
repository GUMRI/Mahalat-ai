import { AccountRecord } from './accounting.models';

export type JournalSourceKind =
  | 'sale'
  | 'purchase'
  | 'sale_return'
  | 'purchase_return'
  | 'customer_collection'
  | 'supplier_payment'
  | 'operating_expense'
  | 'stock_waste'
  | 'cash_variance'
  | 'owner_contribution'
  | 'owner_withdrawal'
  | 'depreciation'
  | 'adjustment'
  | 'reversal'
  | 'period_closing';

export type JournalChannel = 'operation' | 'user' | 'ai';

export interface JournalSource {
  kind: JournalSourceKind;
  channel: JournalChannel;
  operational_id?: string;
  reason?: string;
  user_prompt?: string;
}

export interface JournalDraftLine {
  account_code: string;
  debit: number;
  credit: number;
  activity_id?: string;
}

export interface JournalDraft {
  idempotency_key: string;
  branch_id: string;
  effective_date: string;
  description: string;
  created_by: string;
  source: JournalSource;
  lines: readonly JournalDraftLine[];
}

export interface PostedJournalLine extends Omit<JournalDraftLine, 'activity_id'> {
  branch_id: string;
  activity_id: string | null;
}

export interface PostedJournal {
  id: string;
  sequence: number;
  number: string;
  branch_id: string;
  effective_date: string;
  description: string;
  created_by: string;
  source: JournalSource;
  status: 'posted';
  reversal_of: string | null;
  total_debit: number;
  total_credit: number;
  lines: readonly PostedJournalLine[];
}

export interface AccountingPeriodRecord {
  id: string;
  status: 'open' | 'closed';
  reopened_at?: unknown;
}

export interface JournalValidationContext {
  branchId: string;
  accounts: readonly AccountRecord[];
  periodStatus: 'open' | 'closed';
  actorId: string;
}

export class AccountingEngineError extends Error {
  constructor(
    readonly code:
      | 'invalid_draft'
      | 'unbalanced'
      | 'invalid_account'
      | 'closed_period'
      | 'unauthorized_actor'
      | 'duplicate_reversal'
      | 'idempotency_conflict'
      | 'sequence_corrupt',
    message: string,
  ) {
    super(message);
    this.name = 'AccountingEngineError';
  }
}
