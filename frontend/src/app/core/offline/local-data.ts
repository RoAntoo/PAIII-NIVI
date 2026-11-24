import { Injectable } from '@angular/core';

/** A completed read/write transaction is the commit point for local changes. */
@Injectable({ providedIn: 'root' })
export class LocalData {
  private connection?: Promise<IDBDatabase>;

  read<T, R>(key: string, initial: () => T, select: (data: T) => R): Promise<R> {
    return this.transact(key, initial, select, 'readonly');
  }

  change<T, R>(key: string, initial: () => T, update: (data: T) => R): Promise<R> {
    return this.transact(key, initial, update, 'readwrite');
  }

  private async transact<T, R>(
    key: string, initial: () => T, apply: (data: T) => R, mode: IDBTransactionMode,
  ): Promise<R> {
    const db = await (this.connection ??= this.open().catch(error => {
      this.connection = undefined;
      throw error;
    }));
    return new Promise((resolve, reject) => {
      const tx = db.transaction('data', mode, mode === 'readwrite' ? { durability: 'strict' } : undefined);
      const store = tx.objectStore('data');
      const request = store.get(key);
      let result: R;
      let failure: unknown;
      request.onsuccess = () => {
        try {
          const data = (request.result as T | undefined) ?? initial();
          result = apply(data);
          if (mode === 'readwrite') store.put(data, key);
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
