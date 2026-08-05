import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { CollectionItem } from '../types';

const ITEMS_COLLECTION = 'items';
const MAX_INLINE_IMAGE_CHARS = 700_000;

/** Shrink data-URL images so Firestore 1MB doc limit is not blown. */
async function shrinkImageField(value?: string): Promise<string> {
  if (!value) return '';
  if (!value.startsWith('data:image/')) return value;
  if (value.length <= MAX_INLINE_IMAGE_CHARS) return value;

  try {
    const img = await loadImage(value);
    const canvas = document.createElement('canvas');
    const maxSide = 1280;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return value.slice(0, MAX_INLINE_IMAGE_CHARS);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    let quality = 0.72;
    let out = canvas.toDataURL('image/jpeg', quality);
    while (out.length > MAX_INLINE_IMAGE_CHARS && quality > 0.35) {
      quality -= 0.1;
      out = canvas.toDataURL('image/jpeg', quality);
    }
    if (out.length > MAX_INLINE_IMAGE_CHARS) {
      // Last resort: smaller dimensions
      canvas.width = Math.round(canvas.width * 0.6);
      canvas.height = Math.round(canvas.height * 0.6);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      out = canvas.toDataURL('image/jpeg', 0.5);
    }
    return out.length > MAX_INLINE_IMAGE_CHARS ? '' : out;
  } catch {
    return value.length > MAX_INLINE_IMAGE_CHARS ? '' : value;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function prepareItemForCloud(item: CollectionItem): Promise<CollectionItem> {
  const extra = item.extraImages?.length
    ? await Promise.all(item.extraImages.map((img) => shrinkImageField(img)))
    : [];

  return {
    ...item,
    frontImage: await shrinkImageField(item.frontImage),
    backImage: await shrinkImageField(item.backImage),
    extraImages: extra.filter(Boolean),
  };
}

function stripUserId(data: Record<string, unknown>): CollectionItem {
  const { userId: _uid, ...rest } = data;
  return rest as unknown as CollectionItem;
}

export function subscribeUserItems(
  uid: string,
  onData: (items: CollectionItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, ITEMS_COLLECTION), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return { ...stripUserId(data), id: d.id } as CollectionItem;
      });
      // Newest first for stable UI
      items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      onData(items);
    },
    (err) => onError?.(err as Error)
  );
}

export async function fetchUserItems(uid: string): Promise<CollectionItem[]> {
  const q = query(collection(db, ITEMS_COLLECTION), where('userId', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return { ...stripUserId(data), id: d.id } as CollectionItem;
  });
}

export async function upsertCloudItem(uid: string, item: CollectionItem): Promise<void> {
  const prepared = await prepareItemForCloud(item);
  await setDoc(
    doc(db, ITEMS_COLLECTION, item.id),
    { ...prepared, userId: uid },
    { merge: true }
  );
}

export async function deleteCloudItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, ITEMS_COLLECTION, itemId));
}

/** Full sync: upsert all local items, delete cloud items removed locally. */
export async function syncCollectionToCloud(
  uid: string,
  items: CollectionItem[]
): Promise<void> {
  const q = query(collection(db, ITEMS_COLLECTION), where('userId', '==', uid));
  const snap = await getDocs(q);
  const cloudIds = new Set(snap.docs.map((d) => d.id));
  const localIds = new Set(items.map((i) => i.id));

  const toDelete = [...cloudIds].filter((id) => !localIds.has(id));
  const preparedItems = await Promise.all(items.map((item) => prepareItemForCloud(item)));

  let batch = writeBatch(db);
  let opCount = 0;

  const commitIfNeeded = async (force = false) => {
    if (opCount === 0) return;
    if (!force && opCount < 400) return;
    await batch.commit();
    batch = writeBatch(db);
    opCount = 0;
  };

  for (const item of preparedItems) {
    batch.set(doc(db, ITEMS_COLLECTION, item.id), { ...item, userId: uid }, { merge: true });
    opCount += 1;
    await commitIfNeeded();
  }

  for (const id of toDelete) {
    batch.delete(doc(db, ITEMS_COLLECTION, id));
    opCount += 1;
    await commitIfNeeded();
  }

  await commitIfNeeded(true);
}
