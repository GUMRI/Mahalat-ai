import { inject, InjectionToken, Provider } from '@angular/core';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP');
export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');
export const FIRESTORE = new InjectionToken<Firestore>('FIRESTORE');

function createFirebaseApp(): FirebaseApp {
  const { apiKey, projectId, appId } = environment.firebase;
  if (!apiKey || !projectId || !appId) {
    throw new Error(
      'Firebase is not configured. Set apiKey, projectId, and appId in the environment file.',
    );
  }

  return (
    getApps().find((app) => app.name === '[DEFAULT]') ??
    initializeApp(environment.firebase)
  );
}

export function provideFirebase(): Provider[] {
  return [
    { provide: FIREBASE_APP, useFactory: createFirebaseApp },
    { provide: FIREBASE_AUTH, useFactory: () => getAuth(inject(FIREBASE_APP)) },
    { provide: FIRESTORE, useFactory: () => getFirestore(inject(FIREBASE_APP)) },
  ];
}
