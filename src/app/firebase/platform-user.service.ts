import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { FIRESTORE } from './firebase.providers';

export interface PlatformUserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt?: unknown;
  lastLoginAt?: unknown;
  ownedBusinessId?: string | null;
  activeBusinessId?: string | null;
  activeShopId?: string | null;
}

export interface PlatformNotification {
  id: string;
  type: 'invitation' | 'system' | 'role_update';
  title: string;
  message: string;
  status: 'unread' | 'read' | 'accepted' | 'declined';
  data?: {
    shopId?: string;
    invitationId?: string;
    shopName?: string;
    businessName?: string;
    role?: string;
    expiresAt?: unknown;
    [key: string]: unknown;
  };
  createdAt?: unknown;
}

@Injectable({ providedIn: 'root' })
export class PlatformUserService {
  private readonly firestore: Firestore = inject(FIRESTORE);

  /**
   * Ensures the user profile exists in Firestore upon any successful login,
   * before creating a business or accepting any invitation.
   */
  async ensureUserProfile(user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL?: string | null;
  }): Promise<PlatformUserProfile> {
    const userRef = doc(this.firestore, 'users', user.uid);
    const snap = await getDoc(userRef);

    const displayName =
      user.displayName?.trim() ||
      (user.email ? user.email.split('@')[0] : 'User')
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

    const email = user.email || '';
    const avatarUrl = user.photoURL || '';

    if (!snap.exists()) {
      const newProfile: PlatformUserProfile = {
        uid: user.uid,
        email,
        displayName,
        avatarUrl,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        ownedBusinessId: null,
      };
      await setDoc(userRef, newProfile);
      return newProfile;
    } else {
      const existing = snap.data() as PlatformUserProfile;
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        ...(email && !existing.email ? { email } : {}),
        ...(displayName && !existing.displayName ? { displayName } : {}),
        ...(avatarUrl && !existing.avatarUrl ? { avatarUrl } : {}),
      });
      return {
        ...existing,
        uid: user.uid,
        email: existing.email || email,
        displayName: existing.displayName || displayName,
        avatarUrl: existing.avatarUrl || avatarUrl,
      };
    }
  }

  async getUserProfile(uid: string): Promise<PlatformUserProfile | null> {
    const userRef = doc(this.firestore, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    return snap.data() as PlatformUserProfile;
  }

  /**
   * Search platform users by partial email or display name
   */
  async searchUsers(searchQuery: string, limitCount = 10): Promise<PlatformUserProfile[]> {
    const queryTrimmed = searchQuery.trim().toLowerCase();
    if (!queryTrimmed) return [];

    // Search by email prefix
    try {
      const usersRef = collection(this.firestore, 'users');
      const q = query(
        usersRef,
        where('email', '>=', queryTrimmed),
        where('email', '<=', queryTrimmed + '\uf8ff'),
        limit(limitCount),
      );
      const snapshot = await getDocs(q);
      const results: PlatformUserProfile[] = [];
      snapshot.forEach((docSnap) => {
        results.push(docSnap.data() as PlatformUserProfile);
      });

      // If nothing found or small set, also check exact match or local collection
      if (results.length === 0 && queryTrimmed.includes('@')) {
        const exactQ = query(usersRef, where('email', '==', queryTrimmed), limit(1));
        const exactSnap = await getDocs(exactQ);
        exactSnap.forEach((d) => results.push(d.data() as PlatformUserProfile));
      }
      return results;
    } catch {
      return [];
    }
  }

  /**
   * Listen to real-time notifications for the current user
   */
  watchNotifications(
    uid: string,
    callback: (notifications: PlatformNotification[]) => void,
  ): () => void {
    const notificationsRef = collection(this.firestore, 'users', uid, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(50));

    return onSnapshot(
      q,
      (snapshot) => {
        const items: PlatformNotification[] = [];
        snapshot.forEach((d) => {
          items.push({ id: d.id, ...(d.data() as Omit<PlatformNotification, 'id'>) });
        });
        callback(items);
      },
      () => {
        // Fallback on error without crashing
        callback([]);
      },
    );
  }

  /**
   * Send notification to a platform user (e.g., an invitation)
   */
  async sendNotification(
    recipientUid: string,
    notification: Omit<PlatformNotification, 'id'>,
  ): Promise<string> {
    const id = crypto.randomUUID().replaceAll('-', '');
    const notifRef = doc(this.firestore, 'users', recipientUid, 'notifications', id);
    await setDoc(notifRef, {
      ...notification,
      id,
      createdAt: serverTimestamp(),
    });
    return id;
  }

  /**
   * Mark notification status
   */
  async updateNotificationStatus(
    uid: string,
    notificationId: string,
    status: 'read' | 'accepted' | 'declined',
  ): Promise<void> {
    const notifRef = doc(this.firestore, 'users', uid, 'notifications', notificationId);
    await updateDoc(notifRef, { status });
  }
}
