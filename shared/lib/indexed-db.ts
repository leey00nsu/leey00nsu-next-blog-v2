'use client'

const DB_NAME = 'studio-drafts'
const DB_VERSION = 1
const STORE_NAME = 'drafts'

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * IndexedDB 데이터베이스 연결을 반환합니다.
 * 싱글톤으로 관리되어 한 번만 연결됩니다.
 */
function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.addEventListener('error', () => {
      reject(new Error('Failed to open IndexedDB'))
    })

    request.addEventListener('success', () => {
      resolve(request.result)
    })

    request.addEventListener('upgradeneeded', (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    })
  })

  return dbPromise
}

/**
 * IndexedDB에 데이터를 저장합니다.
 */
export async function putDraft<T extends { id: string }>(
  data: T,
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(data)

    request.addEventListener('success', () => resolve())
    request.addEventListener('error', () =>
      reject(new Error('Failed to save draft')),
    )
  })
}

/**
 * IndexedDB에서 데이터를 가져옵니다.
 */
export async function getDraft<T>(id: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(id)

    request.addEventListener('success', () =>
      resolve(request.result as T | undefined),
    )
    request.addEventListener('error', () =>
      reject(new Error('Failed to get draft')),
    )
  })
}

/**
 * IndexedDB에서 데이터를 삭제합니다.
 */
export async function deleteDraft(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.addEventListener('success', () => resolve())
    request.addEventListener('error', () =>
      reject(new Error('Failed to delete draft')),
    )
  })
}

/**
 * IndexedDB에서 모든 draft ID 목록을 가져옵니다.
 */
export async function getAllDraftIds(): Promise<string[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAllKeys()

    request.addEventListener('success', () =>
      resolve(request.result as string[]),
    )
    request.addEventListener('error', () =>
      reject(new Error('Failed to get draft keys')),
    )
  })
}
