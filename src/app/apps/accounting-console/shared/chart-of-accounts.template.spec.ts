import {
  ACCOUNT_GROUPS,
  CHART_OF_ACCOUNTS_TEMPLATE,
  CHART_OF_ACCOUNTS_TEMPLATE_VERSION,
  validateChartOfAccountsTemplate,
} from './chart-of-accounts.template';

describe('standard chart of accounts template', () => {
  it('contains 24 unique leaf system accounts under the five fixed groups', () => {
    expect(() => validateChartOfAccountsTemplate()).not.toThrow();
    expect(CHART_OF_ACCOUNTS_TEMPLATE_VERSION).toBe(1);
    expect(CHART_OF_ACCOUNTS_TEMPLATE).toHaveLength(24);
    expect(new Set(CHART_OF_ACCOUNTS_TEMPLATE.map((account) => account.code)).size).toBe(24);
    expect(ACCOUNT_GROUPS.map((group) => group.code)).toEqual([
      '1000',
      '2000',
      '3000',
      '4000',
      '5000',
    ]);
    expect(CHART_OF_ACCOUNTS_TEMPLATE.every((account) => account.is_leaf && account.is_system)).toBe(
      true,
    );
  });

  it('classifies only asset and liability accounts as current or non-current', () => {
    for (const account of CHART_OF_ACCOUNTS_TEMPLATE) {
      if (account.group_code === '1000' || account.group_code === '2000') {
        expect(['current', 'non_current']).toContain(account.classification);
      } else {
        expect(account.classification).toBeNull();
      }
    }
  });

  it('provides the required localized hierarchical name for each account', () => {
    for (const account of CHART_OF_ACCOUNTS_TEMPLATE) {
      expect(account.name.ar.split(' - ')).toHaveLength(3);
      expect(account.name.en.split(' - ')).toHaveLength(3);
      expect(account.name.fr.split(' - ')).toHaveLength(3);
    }
  });
});
