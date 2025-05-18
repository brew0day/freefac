// api/notify.js

const TOKEN        = process.env.TELEGRAM_TOKEN;
const CHAT         = process.env.CHAT_ID;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // CORS pour Safari
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // On récupère juste le User-Agent
  const ua = req.headers['user-agent'] || 'inconnu';

  // Envoi en texte brut du seul UA
  const payload = {
    chat_id: CHAT,
    text: ua,                     // ← ici
    disable_web_page_preview: true
  };

  const tg = await fetch(
    `https://api.telegram.org/bot${TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  const raw = await tg.text();
  return res.status(tg.ok ? 200 : tg.status).json({ ok: tg.ok, full: raw });
}