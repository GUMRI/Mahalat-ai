import { Injectable, inject } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import {
  Timestamp,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
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

export type ShopAccessState = 'ready' | 'chooseShop';

export interface ShopDetails {
  name: string;
  businessType: BusinessType;
  countryCode: CountryCode;
  currency: string;
  logoUrl: string | null;
}

export type ShopMemberRole = 'owner' | 'manager' | 'cashier' | 'accountant';

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
    return (await this.getCurrentShopId(userId)) ? 'ready' : 'chooseShop';
  }

  async getCurrentShopId(userId: string): Promise<string | null> {
    const profile = await getDoc(doc(this.firestore, 'users', userId));
    const profileShopId = profile.data()?.['shopId'];
    const shopId =
      typeof profileShopId === 'string' && profileShopId ? profileShopId : userId;
    const [shop, membership] = await Promise.all([
      getDoc(doc(this.firestore, 'shops', shopId)),
      getDoc(doc(this.firestore, 'shops', shopId, 'members', userId)),
    ]);
    return shop.exists() && membership.exists() ? shopId : null;
  }

  async getCurrentShopRole(userId: string): Promise<ShopMemberRole | null> {
    const shopId = await this.getCurrentShopId(userId);
    if (!shopId) return null;
    const membership = await getDoc(
      doc(this.firestore, 'shops', shopId, 'members', userId),
    );
    const role = membership.data()?.['role'];
    return isShopMemberRole(role) ? role : null;
  }

  async createUserInvitation(userId: string): Promise<string> {
    const shopId = await this.getCurrentShopId(userId);
    if (!shopId) {
      throw new FirebaseError(
        'shop/invite-not-authorized',
        'A shop membership is required to create an invitation.',
      );
    }

    const invitationId = crypto.randomUUID().replaceAll('-', '');
    const shopRef = doc(this.firestore, 'shops', shopId);
    const memberRef = doc(this.firestore, 'shops', shopId, 'members', userId);
    const inviteRef = doc(
      this.firestore,
      'shops',
      shopId,
      'invitations',
      invitationId,
    );
    await runTransaction(this.firestore, async (transaction) => {
      const [shop, member, invite] = await Promise.all([
        transaction.get(shopRef),
        transaction.get(memberRef),
        transaction.get(inviteRef),
      ]);
      const role = member.data()?.['role'];
      const branchId = member.data()?.['branchId'];
      if (
        !shop.exists() ||
        !member.exists() ||
        (role !== 'owner' && role !== 'manager') ||
        typeof branchId !== 'string' ||
        invite.exists()
      ) {
        throw new FirebaseError(
          'shop/invite-not-authorized',
          'Only a shop owner or manager can create a valid shop invitation.',
        );
      }

      transaction.set(inviteRef, {
        branchId,
        role: 'cashier',
        status: 'pending',
        issuedBy: userId,
        issuedAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
      });
    });

    const invitationUrl = new URL('/', window.location.origin);
    invitationUrl.searchParams.set('shopId', shopId);
    invitationUrl.searchParams.set('invitationId', invitationId);
    return invitationUrl.toString();
  }

  async getShopDetails(userId: string): Promise<ShopDetails | null> {
    const shopId = (await this.getCurrentShopId(userId)) ?? userId;
    const snapshot = await getDoc(doc(this.firestore, 'shops', shopId));
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

  async joinWithInvitation(
    userId: string,
    email: string,
    invitationUrl: string,
  ): Promise<string> {
    const invitation = parseShopInvitation(invitationUrl);
    const shopRef = doc(this.firestore, 'shops', invitation.shopId);
    const inviteRef = doc(
      this.firestore,
      'shops',
      invitation.shopId,
      'invitations',
      invitation.invitationId,
    );
    const memberRef = doc(
      this.firestore,
      'shops',
      invitation.shopId,
      'members',
      userId,
    );
    const userRef = doc(this.firestore, 'users', userId);

    await runTransaction(this.firestore, async (transaction) => {
      const [shop, invite, member, userProfile] = await Promise.all([
        transaction.get(shopRef),
        transaction.get(inviteRef),
        transaction.get(memberRef),
        transaction.get(userRef),
      ]);
      if (!shop.exists() || !invite.exists()) {
        throw new FirebaseError(
          'shop/invalid-invitation',
          'The shop invitation is invalid or no longer available.',
        );
      }
      if (member.exists()) {
        throw new FirebaseError(
          'shop/already-member',
          'This account is already a member of the shop.',
        );
      }
      const currentShopId = userProfile.data()?.['shopId'];
      if (typeof currentShopId === 'string' && currentShopId !== invitation.shopId) {
        throw new FirebaseError(
          'shop/already-linked',
          'This account is already linked to another shop.',
        );
      }

      const inviteData = invite.data();
      const branchId = inviteData['branchId'];
      const role = inviteData['role'];
      const expiresAt = inviteData['expiresAt'];
      if (
        inviteData['status'] !== 'pending' ||
        !(expiresAt instanceof Timestamp) ||
        expiresAt.toMillis() <= Date.now() ||
        typeof branchId !== 'string' ||
        !isInvitedRole(role)
      ) {
        throw new FirebaseError(
          'shop/invalid-invitation',
          'The shop invitation is invalid, expired, or already used.',
        );
      }
      const invitedEmail = inviteData['email'];
      if (
        typeof invitedEmail === 'string' &&
        invitedEmail.toLowerCase() !== email.toLowerCase()
      ) {
        throw new FirebaseError(
          'shop/invitation-email-mismatch',
          'This invitation was issued to a different email address.',
        );
      }

      const branchRef = doc(
        this.firestore,
        'shops',
        invitation.shopId,
        'branches',
        branchId,
      );
      const branch = await transaction.get(branchRef);
      if (!branch.exists()) {
        throw new FirebaseError(
          'shop/invalid-invitation',
          'The invitation refers to a branch that does not exist.',
        );
      }

      const createdAt = serverTimestamp();
      transaction.update(inviteRef, {
        status: 'accepted',
        acceptedBy: userId,
        acceptedAt: serverTimestamp(),
      });
      transaction.set(memberRef, {
        uid: userId,
        email,
        branchId,
        role,
        _deleted: false,
        serverTimestamp: serverTimestamp(),
        createdAt,
      });
      transaction.set(
        userRef,
        { uid: userId, email, shopId: invitation.shopId, branchId, role, createdAt },
        { merge: true },
      );
    });
    return invitation.shopId;
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
        _deleted: false,
        serverTimestamp: serverTimestamp(),
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

interface ShopInvitationReference {
  readonly shopId: string;
  readonly invitationId: string;
}

function parseShopInvitation(value: string): ShopInvitationReference {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new FirebaseError(
      'shop/invalid-invitation',
      'The QR code does not contain a valid shop invitation.',
    );
  }
  const shopId = url.searchParams.get('shopId');
  const invitationId = url.searchParams.get('invitationId');
  if (
    url.origin !== window.location.origin ||
    url.pathname !== '/' ||
    !shopId ||
    !invitationId ||
    shopId.length > 128 ||
    invitationId.length > 256 ||
    shopId.includes('/') ||
    invitationId.includes('/')
  ) {
    throw new FirebaseError(
      'shop/invalid-invitation',
      'The QR code does not contain a valid shop invitation.',
    );
  }
  return { shopId, invitationId };
}

function isInvitedRole(value: unknown): value is 'manager' | 'cashier' | 'accountant' {
  return value === 'manager' || value === 'cashier' || value === 'accountant';
}

function isShopMemberRole(value: unknown): value is ShopMemberRole {
  return value === 'owner' || value === 'manager' || isInvitedRole(value);
}
