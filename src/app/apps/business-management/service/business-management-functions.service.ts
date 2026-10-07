import { Injectable } from '@angular/core';

export type BusinessManagementFunctionType = 'navigation' | 'read' | 'write' | 'execution';
export type BusinessManagementRole = 'owner' | 'manager' | 'cashier' | 'accountant';

export interface BusinessManagementFunctionInput {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'date';
  readonly required: boolean;
  readonly description: string;
  readonly options?: readonly string[];
}

export interface BusinessManagementFunctionDefinition {
  readonly name: string;
  readonly description: string;
  readonly type: BusinessManagementFunctionType;
  readonly requiredRole: BusinessManagementRole;
  readonly inputs: readonly BusinessManagementFunctionInput[];
  readonly output: string;
}

export interface BusinessManagementFunctionContext {
  readonly shopId: string;
  readonly userId: string;
  readonly route: string;
  readonly requestedAt: string;
}

export interface BusinessManagementExecutionResult {
  readonly status: 'ok' | 'validation-error' | 'not-found';
  readonly message: string;
  readonly functionName?: string;
}

@Injectable({
  providedIn: 'root',
})
export class BusinessManagementFunctionService {
  private readonly catalog: readonly BusinessManagementFunctionDefinition[] = [
    {
      name: 'open_page',
      description: 'Open a dashboard, document, party, or item page with a preselected filter.',
      type: 'navigation',
      requiredRole: 'owner',
      inputs: [
        { name: 'page', type: 'enum', required: true, description: 'Target page name', options: ['overview', 'sales', 'purchases', 'expenses', 'inventory', 'customers'] },
        { name: 'filter', type: 'string', required: false, description: 'Optional filter value such as customer or product' },
      ],
      output: 'Opens the requested page with the selected filter in context.',
    },
    {
      name: 'create_sale_draft',
      description: 'Create a new sale draft for the current shop, ready for review.',
      type: 'write',
      requiredRole: 'cashier',
      inputs: [
        { name: 'customerId', type: 'string', required: false, description: 'Customer to attach to the sale' },
        { name: 'items', type: 'array', required: true, description: 'Sale lines to create' },
      ],
      output: 'Returns the draft ID and a preview of the expected totals.',
    },
    {
      name: 'confirm_invoice',
      description: 'Confirm a prepared invoice after a final review and create the accounting journal automatically.',
      type: 'execution',
      requiredRole: 'owner',
      inputs: [
        { name: 'invoiceId', type: 'string', required: true, description: 'Draft invoice identifier' },
        { name: 'confirm', type: 'boolean', required: true, description: 'Requires explicit confirmation before execution' },
      ],
      output: 'Creates a posted operational document and posts the balanced accounting entry.',
    },
    {
      name: 'create_expense',
      description: 'Log an operating expense for the current shift or period.',
      type: 'write',
      requiredRole: 'manager',
      inputs: [
        { name: 'category', type: 'enum', required: true, description: 'Expense category', options: ['rent', 'utilities', 'salary', 'maintenance', 'other'] },
        { name: 'amount', type: 'number', required: true, description: 'Expense amount in the shop currency' },
      ],
      output: 'Returns the created expense document and pending approval state.',
    },
    {
      name: 'get_cash_status',
      description: 'Returns the current cash position for the active shift and cash drawer details.',
      type: 'read',
      requiredRole: 'cashier',
      inputs: [
        { name: 'period', type: 'enum', required: false, description: 'Time window to review', options: ['today', 'week', 'month'] },
      ],
      output: 'Cash opening, inflows, outflows, and the current available balance.',
    },
    {
      name: 'search_items',
      description: 'Search items by name, barcode, or product category.',
      type: 'read',
      requiredRole: 'cashier',
      inputs: [
        { name: 'query', type: 'string', required: true, description: 'Search query to match name or barcode' },
      ],
      output: 'Returns matching items with stock, price, and quantity information.',
    },
  ];

  listFunctions(): readonly BusinessManagementFunctionDefinition[] {
    return [...this.catalog];
  }

  getFunction(name: string): BusinessManagementFunctionDefinition | undefined {
    return this.catalog.find((definition) => definition.name === name);
  }

  execute(name: string, context: BusinessManagementFunctionContext): BusinessManagementExecutionResult {
    const definition = this.getFunction(name);
    if (!definition) {
      return {
        status: 'not-found',
        message: `Function ${name} is not registered for this workspace.`,
      };
    }

    const validation = this.validateContext(context);
    if (!validation.ok) {
      return {
        status: 'validation-error',
        message: validation.message,
        functionName: name,
      };
    }

    return {
      status: 'ok',
      message: `Prepared ${definition.name} for ${context.shopId} at ${context.requestedAt}.`,
      functionName: name,
    };
  }

  private validateContext(context: BusinessManagementFunctionContext): { ok: boolean; message: string } {
    if (!context.shopId.trim()) {
      return { ok: false, message: 'Shop identifier is required.' };
    }

    if (!context.userId.trim()) {
      return { ok: false, message: 'User identifier is required.' };
    }

    if (!context.route.trim()) {
      return { ok: false, message: 'Current route is required for function execution.' };
    }

    return { ok: true, message: 'validated' };
  }
}
