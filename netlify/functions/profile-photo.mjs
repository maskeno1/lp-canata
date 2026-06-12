import { getStore } from '@netlify/blobs';

const key = 'profile-photo';
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export default async (request) => {
  const store = getStore('site-images');

  if (request.method === 'GET') {
    try {
      const entry = await store.getWithMetadata(key, {
        consistency: 'strong',
        type: 'arrayBuffer',
      });
      if (!entry) return new Response('Not found', { status: 404 });
      return new Response(entry.data, {
        headers: {
          'Content-Type': entry.metadata?.contentType || 'image/jpeg',
          'Cache-Control': 'no-store',
        },
      });
    } catch (error) {
      console.error('Failed to load profile photo', error);
      return json({ error: '共有ストレージから写真を読み込めませんでした' }, 500);
    }
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const form = await request.formData().catch(() => null);
  const photo = form?.get('photo');
  if (!photo || typeof photo === 'string' || !allowedTypes.has(photo.type)) {
    return json({ error: 'JPG・PNG・WEBP形式の画像を選択してください' }, 400);
  }
  if (photo.size > 3 * 1024 * 1024) {
    return json({ error: '画像サイズは3MB以下にしてください' }, 413);
  }

  try {
    await store.set(key, photo, {
      metadata: { contentType: photo.type },
    });
    return json({ status: 'ok' });
  } catch (error) {
    console.error('Failed to save profile photo', error);
    return json({ error: '共有ストレージへの保存に失敗しました' }, 500);
  }
};
