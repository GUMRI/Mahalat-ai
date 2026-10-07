import { AccountRecord } from './accounting.models';
import {
  AccountingEngineError,
  JournalDraft,
  JournalValidationContext,
} from './accounting-engine.models';

const MAX_JOURNAL_LINES = 100;
const CODE_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const SOURCE_KINDS = new Set([
  'sale',
  'purchase',
  'sale_return',
  'purchase_return',
  'customer_collection',
  'supplier_payment',
  'operating_expense',
  'stock_waste',
  'cash_variance',
  'owner_contribution',
  'owner_withdrawal',
  'depreciation',
  'adjustment',
  'reversal',
  'period_closing',
]);

export interface ValidatedJournalDraft {
  lines: JournalDraft['lines'];
  total: number;
  periodId: string;
  canonicalPayload: string;
}

export function validateJournalDraft(
  draft: JournalDraft,
  context: JournalValidationContext,
): ValidatedJournalDraft {
  if (
    !draft ||
    draft.branch_id !== context.branchId ||
    !CODE_PATTERN.test(draft.branch_id) ||
    !CODE_PATTERN.test(draft.idempotency_key) ||
    !CODE_PATTERN.test(draft.created_by) ||
    draft.created_by !== context.actorId ||
    !isValidDate(draft.effective_date) ||
    typeof draft.description !== 'string' ||
    !draft.description.trim() ||
    draft.description.trim().length > 500 ||
    !Array.isArray(draft.lines) ||
    draft.lines.length < 2 ||
    draft.lines.length > MAX_JOURNAL_LINES ||
    !isValidSource(draft)
  ) {
    throw new AccountingEngineError('invalid_draft', 'Journal draft is incomplete or invalid.');
  }
  if (context.periodStatus === 'closed') {
    throw new AccountingEngineError(
      'closed_period',
      `Accounting period ${draft.effective_date.slice(0, 7)} is closed.`,
    );
  }

  const accounts = new Map(context.accounts.map((account) => [account.code, account]));
  let totalDebit = 0;
  let totalCredit = 0;
  const normalizedLines = draft.lines.map((line) => {
    if (
      !line ||
      typeof line.account_code !== 'string' ||
      !/^\d{4,16}$/.test(line.account_code) ||
      !isNonNegativeSafeInteger(line.debit) ||
      !isNonNegativeSafeInteger(line.credit) ||
      (line.debit === 0) === (line.credit === 0) ||
      (line.activity_id !== undefined && !CODE_PATTERN.test(line.activity_id))
    ) {
      throw new AccountingEngineError('invalid_draft', 'Journal line is invalid.');
    }

    const account = accounts.get(line.account_code);
    if (!account || !isPostableAccount(account, context.branchId)) {
      throw new AccountingEngineError(
        'invalid_account',
        `Account ${line.account_code} is missing, inactive, or not a leaf account.`,
      );
    }

    totalDebit += line.debit;
    totalCredit += line.credit;
    if (!Number.isSafeInteger(totalDebit) || !Number.isSafeInteger(totalCredit)) {
      throw new AccountingEngineError('invalid_draft', 'Journal total exceeds safe integer limits.');
    }

    return {
      account_code: line.account_code,
      debit: line.debit,
      credit: line.credit,
      ...(line.activity_id ? { activity_id: line.activity_id } : {}),
    };
  });

  if (totalDebit <= 0 || totalDebit !== totalCredit) {
    throw new AccountingEngineError(
      'unbalanced',
      `Journal is not balanced: debit ${totalDebit}, credit ${totalCredit}.`,
    );
  }

  const normalized = {
    branch_id: draft.branch_id,
    effective_date: draft.effective_date,
    description: draft.description.trim(),
    created_by: draft.created_by,
    source: {
      kind: draft.source.kind,
      channel: draft.source.channel,
      ...(draft.source.operational_id
        ? { operational_id: draft.source.operational_id }
        : {}),
      ...(draft.source.reason ? { reason: draft.source.reason.trim() } : {}),
      ...(draft.source.user_prompt ? { user_prompt: draft.source.user_prompt.trim() } : {}),
    },
    lines: normalizedLines,
  };

  return {
    lines: normalizedLines,
    total: totalDebit,
    periodId: draft.effective_date.slice(0, 7),
    canonicalPayload: JSON.stringify(normalized),
  };
}

export function isPostableAccount(account: AccountRecord, branchId: string): boolean {
  return (
    account.branch_id === branchId &&
    account.is_leaf &&
    account.is_active !== false
  );
}

function isValidSource(draft: JournalDraft): boolean {
  const source = draft.source;
  if (
    !source ||
    !SOURCE_KINDS.has(source.kind) ||
    !['operation', 'user', 'ai'].includes(source.channel)
  ) {
    return false;
  }
  if (
    source.channel === 'operation' &&
    (!source.operational_id || !CODE_PATTERN.test(source.operational_id))
  ) {
    return false;
  }
  if (
    source.channel === 'user' &&
    source.kind !== 'adjustment' &&
    source.kind !== 'reversal' &&
    source.kind !== 'period_closing'
  ) {
    return false;
  }
  if (source.channel === 'ai' && !source.user_prompt?.trim()) return false;
  if (
    source.channel === 'ai' &&
    source.kind !== 'adjustment' &&
    source.kind !== 'reversal'
  ) {
    return false;
  }
  if (
    (source.kind === 'adjustment' ||
      source.kind === 'reversal' ||
      source.kind === 'period_closing') &&
    (!source.reason?.trim() || source.reason.trim().length > 500)
  ) {
    return false;
  }
  if (source.kind === 'reversal' && !source.operational_id) return false;
  return true;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isNonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
