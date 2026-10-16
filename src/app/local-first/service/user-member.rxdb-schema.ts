import type { RxJsonSchema } from 'rxdb/plugins/core';
import type { ShopUser } from '../shared/user-member.model';

export const SHOP_USER_RXDB_SCHEMA: RxJsonSchema<ShopUser> = {
  title: 'Shop membership storage',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 128 },
    uid: { type: 'string', maxLength: 128 },
    displayName: { type: 'string', maxLength: 128 },
    avatarUrl: { type: 'string', maxLength: 1024 },
    email: { type: 'string', maxLength: 320 },
    name: { type: ['string', 'null'], maxLength: 256 },
    displayName: { type: ['string', 'null'], maxLength: 256 },
    avatar: { type: ['string', 'null'], maxLength: 2048 },
    photoURL: { type: ['string', 'null'], maxLength: 2048 },
    branchId: { type: 'string', maxLength: 128 },
    role: {
      type: 'string',
      enum: ['owner', 'manager', 'cashier', 'accountant', 'worker', 'client'],
    },
    createdAt: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        seconds: { type: 'number' },
        nanoseconds: { type: 'number' },
      },
      required: ['seconds', 'nanoseconds'],
    },
  },
  required: ['id', 'uid', 'email', 'branchId', 'role'],
};
