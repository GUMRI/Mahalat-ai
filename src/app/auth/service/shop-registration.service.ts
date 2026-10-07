import { Injectable, inject } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { FIREBASE_APP, FIRESTORE } from '../../firebase/firebase.providers';
import {
  CHART_OF_ACCOUNTS_TEMPLATE,
  CHART_OF_ACCOUNTS_TEMPLATE_VERSION,
} from '../../apps/accounting-console/shared/chart-of-accounts.template';

export type BusinessType = 'grocery' | 'clothing' | 'perfumery' | 'bookstore' | 'cafe';
export type CountryCode = 'TN' | 'DZ' | 'MA' | 'FR' | 'US';

export interface ShopRegistration {
  name: string;
  businessType: BusinessType;
  countryCode: CountryCode;
  currency: string;
  logo?: File;
  extensions: {
    electronicPayments: boolean;
    advancedReports: boolean;
    eInvoicing: boolean;
  };
}

export type ShopAccessState = 'ready' | 'setup' | 'linkedAccount';

export interface ShopDetails {
  name: string;
  businessType: BusinessType;
  countryCode: CountryCode;
  currency: string;
  logoUrl: string | null;
}

const COUNTRY_CURRENCIES: Record<CountryCode, string> = {
  TN: 'TND',
  DZ: 'DZD',
  MA: 'MAD',
  FR: 'EUR',
  US: 'USD',
};

const COUNTRY_CODES = new Set<CountryCode>(['TN', 'DZ', 'MA', 'FR', 'US']);
const BUSINESS_TYPES = new Set<BusinessType>([
  'grocery',
  'clothing',
  'perfumery',
  'bookstore',
  'cafe',
]);

@Injectable({ providedIn: 'root' })
export class ShopRegistrationService {
  private readonly firestore = inject(FIRESTORE);
  private readonly storage = getStorage(inject(FIREBASE_APP));

  detectCountry(): CountryCode {
    const tags = typeof navigator === 'undefined' ? [] : navigator.languages;
    for (const tag of tags) {
      const region = new Intl.Locale(tag).region;
      if (region && COUNTRY_CODES.has(region as CountryCode)) {
        return region as CountryCode;
      }
    }
    return 'TN';
  }

  async getAccessState(userId: string): Promise<ShopAccessState> {
    const [shop, profile] = await Promise.all([
      getDoc(doc(this.firestore, 'shops', userId)),
      getDoc(doc(this.firestore, 'users', userId)),
    ]);
    if (shop.exists()) return 'ready';
    return profile.exists() ? 'linkedAccount' : 'setup';
  }

  async getShopDetails(userId: string): Promise<ShopDetails | null> {
    const snapshot = await getDoc(doc(this.firestore, 'shops', userId));
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    if (
      typeof data['name'] !== 'string' ||
      typeof data['businessType'] !== 'string' ||
      !BUSINESS_TYPES.has(data['businessType'] as BusinessType) ||
      typeof data['countryCode'] !== 'string' ||
      !COUNTRY_CODES.has(data['countryCode'] as CountryCode) ||
      typeof data['currency'] !== 'string' ||
      (data['logoUrl'] !== undefined &&
        data['logoUrl'] !== null &&
        typeof data['logoUrl'] !== 'string')
    ) {
      throw new Error('Shop profile is missing required workspace details.');
    }
    return {
      name: data['name'],
      businessType: data['businessType'] as BusinessType,
      countryCode: data['countryCode'] as CountryCode,
      currency: data['currency'],
      logoUrl: typeof data['logoUrl'] === 'string' ? data['logoUrl'] : null,
    };
  }

  async register(
    userId: string,
    email: string,
    setup: ShopRegistration,
  ): Promise<void> {
    let logoUrl: string | null = null;
    if (setup.logo) {
      const extension = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
      }[setup.logo.type];
      if (!extension) {
        throw new FirebaseError('shop/invalid-logo', 'Unsupported shop logo format.');
      }
      const logoRef = ref(this.storage, `shops/${userId}/logo.${extension}`);
      const uploaded = await uploadBytes(logoRef, setup.logo, {
        contentType: setup.logo.type,
      });
      logoUrl = await getDownloadURL(uploaded.ref);
    }

    const shopRef = doc(this.firestore, 'shops', userId);
    const userRef = doc(this.firestore, 'users', userId);
    const memberRef = doc(this.firestore, 'shops', userId, 'members', userId);
    const branchRef = doc(this.firestore, 'shops', userId, 'branches', 'main');
    const createdAt = serverTimestamp();

    await runTransaction(this.firestore, async (transaction) => {
      if ((await transaction.get(shopRef)).exists()) {
        throw new FirebaseError(
          'shop/already-registered',
          'A shop is already registered for this account.',
        );
      }

      transaction.set(shopRef, {
        name: setup.name.trim(),
        businessType: setup.businessType,
        countryCode: setup.countryCode,
        currency: setup.currency,
        logoUrl,
        extensions: setup.extensions,
        ownerId: userId,
        defaultBranchId: 'main',
        accountTemplateVersion: CHART_OF_ACCOUNTS_TEMPLATE_VERSION,
        createdAt,
        schemaVersion: 1,
      });
      transaction.set(userRef, {
        uid: userId,
        email,
        shopId: userId,
        branchId: 'main',
        role: 'owner',
        createdAt,
      });
      transaction.set(memberRef, {
        uid: userId,
        email,
        branchId: 'main',
        role: 'owner',
        createdAt,
      });
      transaction.set(branchRef, {
        id: 'main',
        name: setup.name.trim(),
        countryCode: setup.countryCode,
        currency: setup.currency,
        createdAt,
      });

      for (const account of CHART_OF_ACCOUNTS_TEMPLATE) {
        transaction.set(
          doc(this.firestore, 'shops', userId, 'branches', 'main', 'accounts', account.code),
          {
            ...account,
            branch_id: 'main',
            template_version: CHART_OF_ACCOUNTS_TEMPLATE_VERSION,
            created_at: createdAt,
          },
        );
      }
    });
  }

  currencyFor(countryCode: CountryCode): string {
    return COUNTRY_CURRENCIES[countryCode];
  }
}
