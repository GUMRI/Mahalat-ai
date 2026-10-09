import { Injectable, inject, signal } from '@angular/core';
import {
  collection as firestoreCollection,
  type CollectionReference,
} from 'firebase/firestore';
import {
  createRxDatabase,
  type RxCollection,
  type RxDatabase,
  type RxJsonSchema,
} from 'rxdb/plugins/core';
import { replicateFirestore } from 'rxdb/plugins/replication-firestore';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { FIRESTORE } from '../../firebase/firebase.providers';
import { environment } from '../../../environments/environment';
import type { LocalFirstSync } from '../shared/local-first-collection.model';

const SERVER_TIMESTAMP_FIELD = 'serverTimestamp';

@Injectable({ providedIn: 'root' })
export class LocalFirstDatabaseService {
  private readonly firestore = inject(FIRESTORE);
  private readonly databases = new Map<string, Promise<RxDatabase>>();
  private readonly collectionLocks = new Map<string, Promise<void>>();

  async openCollection<T extends Record<string, unknown>>(
    shopId: string,
    branchId: string,
    collectionName: string,
    storageSchema: RxJsonSchema<T>,
  ): Promise<LocalFirstSync<T>> {
    validatePathSegment(shopId, 'shopId');
    validatePathSegment(branchId, 'branchId');
    validateCollectionName(collectionName);
    const databaseKey = `${shopId}/${branchId}/${collectionName}`;
    return this.openScopedCollection(
      databaseKey,
      `shops/${shopId}/branches/${branchId}/local-first-${collectionName}`,
      collectionName,
      storageSchema,
    );
  }

  async openUsersCollection<T extends Record<string, unknown>>(
    shopId: string,
    storageSchema: RxJsonSchema<T>,
  ): Promise<LocalFirstSync<T>> {
    validatePathSegment(shopId, 'shopId');
    return this.openScopedCollection(
      `${shopId}/members/users`,
      `shops/${shopId}/members`,
      'users',
      storageSchema,
    );
  }

  private async openScopedCollection<T extends Record<string, unknown>>(
    databaseKey: string,
    firestorePath: string,
    collectionName: string,
    storageSchema: RxJsonSchema<T>,
  ): Promise<LocalFirstSync<T>> {
    validateCollectionName(collectionName);
    if (
      Object.hasOwn(
        storageSchema.properties ?? {},
        SERVER_TIMESTAMP_FIELD,
      )
    ) {
      throw new Error(
        `"${SERVER_TIMESTAMP_FIELD}" is reserved for Firestore replication and must not be declared in the RxDB schema.`,
      );
    }

    return this.withCollectionLock(databaseKey, () =>
      this.openCollectionInDatabase(
        firestorePath,
        collectionName,
        storageSchema,
        databaseKey,
      ),
    );
  }

  private async openCollectionInDatabase<T extends Record<string, unknown>>(
    firestorePath: string,
    collectionName: string,
    storageSchema: RxJsonSchema<T>,
    databaseKey: string,
  ): Promise<LocalFirstSync<T>> {
    const database = await this.getDatabase(databaseKey);
    if (database.collections[collectionName]) {
      throw new Error(
        `Local-first collection "${collectionName}" is already open for this scope.`,
      );
    }

    try {
      const collections = await database.addCollections({
        [collectionName]: { schema: storageSchema },
      });
      const rxCollection = collections[collectionName] as RxCollection<
        T,
        unknown,
        unknown,
        unknown
      >;
      const remoteCollection = firestoreCollection(
        this.firestore,
        firestorePath,
      ) as CollectionReference<T>;
      const replication = replicateFirestore({
        replicationIdentifier: `mahalat/${databaseKey}`,
        collection: rxCollection,
        firestore: {
          projectId: environment.firebase.projectId,
          database: this.firestore,
          collection: remoteCollection,
        },
        pull: {},
        push: {},
        live: true,
      });
      const syncError = signal<unknown | null>(null);
      const errorSubscription = replication.error$.subscribe((error) => {
        syncError.set(error);
      });

      return {
        rxCollection,
        replication,
        syncError,
        close: async () => {
          errorSubscription.unsubscribe();
          try {
            await replication.cancel();
          } finally {
            try {
              await database.close();
            } finally {
              this.databases.delete(databaseKey);
            }
          }
        },
      };
    } catch (error) {
      await database.close();
      this.databases.delete(databaseKey);
      throw error;
    }
  }

  private async withCollectionLock<T>(
    key: string,
    open: () => Promise<T>,
  ): Promise<T> {
    const previous = this.collectionLocks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.collectionLocks.set(key, current);
    await previous;
    try {
      return await open();
    } finally {
      release();
      if (this.collectionLocks.get(key) === current) {
        this.collectionLocks.delete(key);
      }
    }
  }

  private async getDatabase(key: string): Promise<RxDatabase> {
    const existing = this.databases.get(key);
    if (existing) return existing;

    const opening = createRxDatabase({
      name: `mahalat-${encodeDatabaseKey(key)}`,
      storage: getRxStorageLocalstorage(),
      multiInstance: true,
    });
    this.databases.set(key, opening);
    try {
      return await opening;
    } catch (error) {
      this.databases.delete(key);
      throw error;
    }
  }
}

function validatePathSegment(value: string, name: string): void {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error(`${name} must be a non-empty Firestore path segment.`);
  }
}

function validateCollectionName(value: string): void {
  if (!/^[a-z][a-zA-Z0-9_-]*$/.test(value)) {
    throw new Error(
      'collectionName must start with a lowercase letter and contain only letters, numbers, underscores, or hyphens.',
    );
  }
}

function encodeDatabaseKey(value: string): string {
  return Array.from(new TextEncoder().encode(value), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
