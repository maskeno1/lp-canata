import { getStore } from '@netlify/blobs';

const store = getStore('site-images');
const key = 'profile-photo';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export default async (request) => {
  if (request.method === 'GET') {
    const entry = await store.getWithMetadata(key, {
      consistency: 'strong',
      type: 'arrayBuffer',
    });
    if (!entry) return new Response('Not found', { status: 404 });
    return new Response(entry.data, {
      headers: {
        'Content-Type': entry.metadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: '不正な送信元です' }, 403);
  }

  const body = await request.json().catch(() => null);
  const match = body?.image?.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return json({ error: '対応していない画像形式です' }, 400);

  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 3 * 1024 * 1024) {
    return json({ error: '画像サイズは3MB以下にしてください' }, 413);
  }

  await store.set(key, bytes, {
    metadata: { contentType: match[1] },
  });
  return json({ status: 'ok' });
};
