import { getStore } from '@netlify/blobs';

const key = 'published-content';
const allowedKeys = new Set(['editable', 'services', 'strengths', 'badges']);
const maxPayloadBytes = 100_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export default async (request) => {
  const store = getStore('site-content');

  if (request.method === 'GET') {
    try {
      return json(await store.get(key, { consistency: 'strong', type: 'json' }) || {});
    } catch (error) {
      console.error('Failed to load site content', error);
      return json({ error: '公開内容を読み込めませんでした' }, 500);
    }
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const update = await request.json().catch(() => null);
  if (!update || typeof update !== 'object' || Array.isArray(update)) {
    return json({ error: '保存内容が不正です' }, 400);
  }

  const entries = Object.entries(update).filter(([name]) => allowedKeys.has(name));
  if (!entries.length) {
    return json({ error: '保存対象がありません' }, 400);
  }
  if (new TextEncoder().encode(JSON.stringify(update)).length > maxPayloadBytes) {
    return json({ error: '保存内容が大きすぎます' }, 413);
  }

  try {
    const next = await store.get(key, { consistency: 'strong', type: 'json' }) || {};
    for (const [name, value] of entries) next[name] = value;
    await store.setJSON(key, next);
    return json({ status: 'ok', content: next });
  } catch (error) {
    console.error('Failed to save site content', error);
    return json({ error: '公開内容を保存できませんでした' }, 500);
  }
};
