import { kv } from '@vercel/kv';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { items, tax, tip, people, venmoUser } = req.body;
    if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'items required' });

    const id = crypto.randomBytes(4).toString('hex');
    const session = {
      items,
      tax: tax || 0,
      tip: tip || 0,
      people: people || [],
      venmoUser: venmoUser || '',
      selections: {},
      createdAt: Date.now(),
    };

    // Expire after 24 hours
    await kv.set(`session:${id}`, JSON.stringify(session), { ex: 86400 });

    return res.status(200).json({ id, url: `/s/${id}` });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
