import { Injectable } from '@angular/core';

/** A completed read/write transaction is the commit point for local changes. */
@Injectable({ providedIn: 'root' })
export class LocalData {
  private connection?: Promise<IDBDatabase>;

  async change<T, R>(key: string, initial: () => T, update: (data: T) => R): Promise<R> {
    const db = await (this.connection ??= this.open().catch(error => {
      this.connection = undefined;
      throw error;
    }));
    return new Promise((resolve, reject) => {
      const tx = db.transaction('data', 'readwrite', { durability: 'strict' });
      const store = tx.objectStore('data');
      const request = store.get(key);
      let result: R;
      let failure: unknown;
      request.onsuccess = () => {
        const data = (request.result as T | undefined) ?? initial();
        try {
          result = update(data);
          store.put(data, key);
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure ?? tx.error ?? new Error('No se pudo guardar en el dispositivo.'));
    });
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('nivi.local.v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('data');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
