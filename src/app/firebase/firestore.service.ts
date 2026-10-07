import { Injectable, inject } from '@angular/core';
import {
  DocumentData,
  UpdateData,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { FIRESTORE } from './firebase.providers';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private readonly firestore = inject(FIRESTORE);

  async getDocument<T extends DocumentData>(
    path: string,
  ): Promise<(T & { id: string }) | null> {
    const snapshot = await getDoc(doc(this.firestore, path));
    return snapshot.exists() ? { ...snapshot.data() as T, id: snapshot.id } : null;
  }

  async getCollection<T extends DocumentData>(
    path: string,
  ): Promise<Array<T & { id: string }>> {
    const snapshot = await getDocs(collection(this.firestore, path));
    return snapshot.docs.map((item) => ({ ...item.data() as T, id: item.id }));
  }

  async addDocument<T extends DocumentData>(path: string, data: T): Promise<string> {
    const reference = await addDoc(collection(this.firestore, path), data);
    return reference.id;
  }

  setDocument<T extends DocumentData>(path: string, data: T): Promise<void> {
    return setDoc(doc(this.firestore, path), data);
  }

  updateDocument(path: string, data: UpdateData<DocumentData>): Promise<void> {
    return updateDoc(doc(this.firestore, path), data);
  }

  deleteDocument(path: string): Promise<void> {
    return deleteDoc(doc(this.firestore, path));
  }
}
