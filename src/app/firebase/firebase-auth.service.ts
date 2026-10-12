import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { FIREBASE_AUTH } from './firebase.providers';
import { PlatformUserService } from './platform-user.service';

@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  private readonly auth: Auth = inject(FIREBASE_AUTH);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformUser = inject(PlatformUserService);

  readonly user = signal<User | null>(null);
  readonly isLoading = signal(true);
  readonly authError = signal<Error | null>(null);
  private resolveInitialized!: () => void;
  private readonly initialized = new Promise<void>((resolve) => {
    this.resolveInitialized = resolve;
  });

  constructor() {
    const unsubscribe = onAuthStateChanged(
      this.auth,
      async (user) => {
        this.user.set(user);
        if (user) {
          try {
            await this.platformUser.ensureUserProfile({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
            });
          } catch (e) {
            console.warn('Failed to ensure platform user profile:', e);
          }
        }
        this.isLoading.set(false);
        this.authError.set(null);
        this.resolveInitialized();
      },
      (error) => {
        this.authError.set(error);
        this.isLoading.set(false);
        this.resolveInitialized();
      },
    );

    this.destroyRef.onDestroy(unsubscribe);
  }

  waitUntilInitialized(): Promise<void> {
    return this.initialized;
  }

  signIn(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  signUp(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  signInWithGoogle(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(this.auth, provider);
  }

  signOut(): Promise<void> {
    return signOut(this.auth);
  }
}
