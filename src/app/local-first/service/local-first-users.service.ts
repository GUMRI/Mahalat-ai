import { Injectable, inject } from '@angular/core';
import { createCollection } from '@tanstack/angular-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';
import { LocalFirstDatabaseService } from './local-first-database.service';
import { SHOP_USER_SCHEMA, type ShopUser } from '../shared/user-member.model';
import { SHOP_USER_RXDB_SCHEMA } from './user-member.rxdb-schema';
import type { LocalFirstCollection } from '../shared/local-first-collection.model';

@Injectable({ providedIn: 'root' })
export class LocalFirstUsersService {
  private readonly database = inject(LocalFirstDatabaseService);
  private readonly collections = new Map<
    string,
    Promise<LocalFirstCollection<ShopUser, typeof SHOP_USER_SCHEMA>>
  >();

  open(
    shopId: string,
  ): Promise<LocalFirstCollection<ShopUser, typeof SHOP_USER_SCHEMA>> {
    const existing = this.collections.get(shopId);
    if (existing) return existing;

    const opening = this.openCollection(shopId);
    this.collections.set(shopId, opening);
    void opening.catch(() => {
      if (this.collections.get(shopId) === opening) {
        this.collections.delete(shopId);
      }
    });
    return opening;
  }

  private async openCollection(
    shopId: string,
  ): Promise<LocalFirstCollection<ShopUser, typeof SHOP_USER_SCHEMA>> {
    const storage = await this.database.openUsersCollection(shopId, SHOP_USER_RXDB_SCHEMA);
    const collection = createCollection(
      rxdbCollectionOptions({
        id: `mahalat:${shopId}/members/users`,
        rxCollection: storage.rxCollection,
        schema: SHOP_USER_SCHEMA,
      }),
    );
    return { collection, syncError: storage.syncError, close: storage.close };
  }
}
