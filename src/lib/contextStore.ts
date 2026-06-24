// src/lib/contextStore.ts
// IndexedDB store for selected contexts. MUST run in the background service
// worker only — IndexedDB opened from a content script uses the host page's
// origin (leaky, per-page). The extension origin keeps this isolated.
import { sortByOrder, type SelectionContext } from './contexts'

const DB_NAME = 'ask-genie'
const DB_VERSION = 1
const STORE = 'contexts'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('byPage', 'pageKey', { unique: false })
        store.createIndex('bySaved', 'saved', { unique: false })
        store.createIndex('byCreatedAt', 'createdAt', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })
  return dbPromise
}

function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDb().then((db) => db.transaction(STORE, mode).objectStore(STORE))
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function putContext(c: SelectionContext): Promise<void> {
  const store = await tx('readwrite')
  await reqToPromise(store.put(c))
}

export async function getContext(id: string): Promise<SelectionContext | undefined> {
  const store = await tx('readonly')
  return (await reqToPromise(store.get(id))) as SelectionContext | undefined
}

export async function getMany(ids: string[]): Promise<SelectionContext[]> {
  const store = await tx('readonly')
  const results = await Promise.all(
    ids.map((id) => reqToPromise<SelectionContext | undefined>(store.get(id))),
  )
  return results.filter((c): c is SelectionContext => c !== undefined)
}

export async function listByPage(pageKey: string): Promise<SelectionContext[]> {
  const store = await tx('readonly')
  const index = store.index('byPage')
  const all = (await reqToPromise(index.getAll(pageKey))) as SelectionContext[]
  return sortByOrder(all)
}

export async function listSaved(): Promise<SelectionContext[]> {
  // 'saved' is a boolean; IDB cannot index booleans reliably across browsers,
  // so filter from the full set (saved contexts are few).
  const all = await allContexts()
  return all.filter((c) => c.saved)
}

export async function allContexts(): Promise<SelectionContext[]> {
  const store = await tx('readonly')
  return (await reqToPromise(store.getAll())) as SelectionContext[]
}

export async function deleteContext(id: string): Promise<void> {
  const store = await tx('readwrite')
  await reqToPromise(store.delete(id))
}

export async function deleteMany(ids: string[]): Promise<void> {
  const store = await tx('readwrite')
  await Promise.all(ids.map((id) => reqToPromise(store.delete(id))))
}

export async function clearPageUnpinned(pageKey: string): Promise<void> {
  const page = await listByPage(pageKey)
  const ids = page.filter((c) => !c.locked && !c.saved).map((c) => c.id)
  await deleteMany(ids)
}

export async function setFlag(
  id: string,
  patch: Partial<Pick<SelectionContext, 'locked' | 'saved'>>,
): Promise<SelectionContext | undefined> {
  const c = await getContext(id)
  if (!c) return undefined
  const updated = { ...c, ...patch }
  await putContext(updated)
  return updated
}
