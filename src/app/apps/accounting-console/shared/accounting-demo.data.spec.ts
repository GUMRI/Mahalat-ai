import { ACCOUNTING_DEMO_ENTRIES } from './accounting-demo.data';
import { CHART_OF_ACCOUNTS_TEMPLATE } from './chart-of-accounts.template';

describe('accounting demo dataset', () => {
  it('contains only balanced examples with integer minor-unit amounts', () => {
    for (const entry of ACCOUNTING_DEMO_ENTRIES) {
      const debits = entry.lines.reduce((total, line) => total + line.debit, 0);
      const credits = entry.lines.reduce((total, line) => total + line.credit, 0);

      expect(debits).toBe(credits);
      expect(entry.lines.every((line) =>
        Number.isSafeInteger(line.debit) &&
        Number.isSafeInteger(line.credit) &&
        (line.debit === 0) !== (line.credit === 0),
      )).toBe(true);
      expect(entry.lines.every((line) =>
        CHART_OF_ACCOUNTS_TEMPLATE.some((account) => account.code === line.account_code),
      )).toBe(true);
    }
  });

  it('reconciles the sample balance sheet after current-period results and withdrawals', () => {
    const signedBalances = new Map<string, number>();
    for (const entry of ACCOUNTING_DEMO_ENTRIES) {
      for (const line of entry.lines) {
        signedBalances.set(
          line.account_code,
          (signedBalances.get(line.account_code) ?? 0) + line.debit - line.credit,
        );
      }
    }

    const total = (groupCode: string, debitNature: boolean) =>
      CHART_OF_ACCOUNTS_TEMPLATE
        .filter((account) => account.group_code === groupCode)
        .reduce((balance, account) => {
          const signed = signedBalances.get(account.code) ?? 0;
          return balance + (debitNature ? signed : -signed);
        }, 0);

    const assets = total('1000', true);
    const liabilities = total('2000', false);
    const equity = total('3000', false);
    const profit = total('4000', false) - total('5000', true);

    expect(assets).toBe(63_000);
    expect(liabilities).toBe(5_000);
    expect(equity + profit).toBe(58_000);
    expect(assets).toBe(liabilities + equity + profit);
  });
});
