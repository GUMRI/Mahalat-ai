import type { Signal } from '@angular/core';
import type { Collection, UtilsRecord } from '@tanstack/angular-db';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { RxCollection } from 'rxdb/plugins/core';
import type { RxFirestoreReplicationState } from 'rxdb/plugins/replication-firestore';

export interface LocalFirstSync<T extends object> {
  readonly rxCollection: RxCollection<T, unknown, unknown, unknown>;
  readonly replication: RxFirestoreReplicationState<T>;
  readonly syncError: Signal<unknown | null>;
  close(): Promise<void>;
}

export interface LocalFirstCollection<
  T extends object,
  TSchema extends StandardSchemaV1 = StandardSchemaV1,
> {
  readonly collection: Collection<T, string, UtilsRecord, TSchema, T>;
  readonly syncError: Signal<unknown | null>;
  close(): Promise<void>;
}
 