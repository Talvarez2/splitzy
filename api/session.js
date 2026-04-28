import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  const raw = await kv.get(`session:${id}`);
  if (!raw) return res.status(404).json({ error: 'Session not found or expired' });

  const session = typeof raw === 'string' ? JSON.parse(raw) : raw;

  if (req.method === 'GET') {
    return res.status(200).json(session);
  }

  if (req.method === 'POST') {
    // A friend submits their selection
    const { name, venmo, selectedItems } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    session.selections[name] = {
      venmo: venmo || '',
      items: selectedItems || [],
      submittedAt: Date.now(),
    };

    await kv.set(`session:${id}`, JSON.stringify(session), { ex: 86400 });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'GET or POST only' });
}
