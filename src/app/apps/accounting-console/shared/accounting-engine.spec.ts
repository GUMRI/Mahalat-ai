import { AccountRecord } from './accounting.models';
import { CHART_OF_ACCOUNTS_TEMPLATE } from './chart-of-accounts.template';
import {
  AccountingEngineError,
  JournalDraft,
} from './accounting-engine.models';
import { validateJournalDraft } from './accounting-engine';

const branchId = 'main';
const actorId = 'owner-1';
const accounts: AccountRecord[] = CHART_OF_ACCOUNTS_TEMPLATE.map((account) => ({
  ...account,
  branch_id: branchId,
  template_version: 1,
  parent_code: null,
  is_leaf: true,
  is_system: true,
}));

function draft(overrides: Partial<JournalDraft> = {}): JournalDraft {
  return {
    idempotency_key: 'sale-1-post',
    branch_id: branchId,
    effective_date: '2026-10-06',
    description: 'Cash sale',
    created_by: actorId,
    source: {
      kind: 'sale',
      channel: 'operation',
      operational_id: 'sale-1',
    },
    lines: [
      { account_code: '1100', debit: 12_500, credit: 0 },
      { account_code: '4100', debit: 0, credit: 12_500 },
    ],
    ...overrides,
  };
}

function validate(
  value: JournalDraft,
  periodStatus: 'open' | 'closed' = 'open',
) {
  return validateJournalDraft(value, {
    branchId,
    accounts,
    periodStatus,
    actorId,
  });
}

describe('accounting engine draft validation', () => {
  it('accepts balanced integer minor-unit drafts and normalizes the source', () => {
    const result = validate(draft({ description: '  Cash sale  ' }));

    expect(result.total).toBe(12_500);
    expect(result.periodId).toBe('2026-10');
    expect(result.canonicalPayload).toContain('"description":"Cash sale"');
  });

  it('rejects unbalanced or floating-point amounts', () => {
    expect(() =>
      validate(draft({
        lines: [
          { account_code: '1100', debit: 12_500, credit: 0 },
          { account_code: '4100', debit: 0, credit: 12_499 },
        ],
      })),
    ).toThrowError(AccountingEngineError);

    expect(() =>
      validate(draft({
        lines: [
          { account_code: '1100', debit: 12.5, credit: 0 },
          { account_code: '4100', debit: 0, credit: 12.5 },
        ],
      })),
    ).toThrowError(AccountingEngineError);
  });

  it('rejects closed periods, missing accounts and non-leaf accounts', () => {
    expect(() => validate(draft(), 'closed')).toThrowError(
      expect.objectContaining({ code: 'closed_period' }),
    );
    expect(() =>
      validate(draft({
        lines: [
          { account_code: '9999', debit: 1, credit: 0 },
          { account_code: '4100', debit: 0, credit: 1 },
        ],
      })),
    ).toThrowError(expect.objectContaining({ code: 'invalid_account' }));

    const nonLeafAccounts = accounts.map((account) =>
      account.code === '1100' ? { ...account, is_leaf: false } : account,
    );
    expect(() =>
      validateJournalDraft(draft(), {
        branchId,
        accounts: nonLeafAccounts,
        periodStatus: 'open',
        actorId,
      }),
    ).toThrowError(expect.objectContaining({ code: 'invalid_account' }));
  });

  it('requires operational provenance, adjustment reasons and AI prompts', () => {
    expect(() =>
      validate(draft({ source: { kind: 'sale', channel: 'operation' } })),
    ).toThrowError(expect.objectContaining({ code: 'invalid_draft' }));

    expect(() =>
      validate(draft({ source: { kind: 'adjustment', channel: 'user' } })),
    ).toThrowError(expect.objectContaining({ code: 'invalid_draft' }));

    expect(() =>
      validate(draft({
        source: { kind: 'adjustment', channel: 'ai', reason: 'correction' },
      })),
    ).toThrowError(expect.objectContaining({ code: 'invalid_draft' }));
  });
});
