import type { StandardSchemaV1 } from '@standard-schema/spec';

export type ShopUserRole = 'owner' | 'manager' | 'cashier' | 'accountant';

export type ShopUser = Record<string, unknown> & {
  id: string;
  uid: string;
  email: string;
  branchId: string;
  role: ShopUserRole;
  createdAt?: {
    type?: string;
    seconds: number;
    nanoseconds: number;
  };
};

export const SHOP_USER_SCHEMA: StandardSchemaV1<ShopUser, ShopUser> = {
  '~standard': {
    version: 1,
    vendor: 'mahalat',
    validate(value) {
      if (!isShopUser(value)) {
        return {
          issues: [{ message: 'Invalid shop membership.', path: [] }],
        };
      }
      return { value };
    },
  },
};

function isShopUser(value: unknown): value is ShopUser {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Record<string, unknown>;
  if (
    typeof user['id'] !== 'string' ||
    typeof user['uid'] !== 'string' ||
    typeof user['email'] !== 'string' ||
    typeof user['branchId'] !== 'string' ||
    !isShopUserRole(user['role'])
  ) {
    return false;
  }
  if (user['createdAt'] === undefined) return true;
  if (typeof user['createdAt'] !== 'object' || user['createdAt'] === null) {
    return false;
  }
  const createdAt = user['createdAt'] as Record<string, unknown>;
  return (
    typeof createdAt['seconds'] === 'number' &&
    typeof createdAt['nanoseconds'] === 'number' &&
    (createdAt['type'] === undefined ||
      typeof createdAt['type'] === 'string')
  );
}

function isShopUserRole(value: unknown): value is ShopUserRole {
  return (
    value === 'owner' ||
    value === 'manager' ||
    value === 'cashier' ||
    value === 'accountant'
  );
}
