// api/notify.js

const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT  = process.env.CHAT_ID;

export const config = {
  api: {
    bodyParser: false, // on lit nous-mêmes le body
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

  // IP client
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'inconnue';

  // User-Agent
  const ua = req.headers['user-agent'] || 'inconnu';

  // Date & heure
  const now = new Date();
  const date = now.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const time = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  // Construction du plain text
  const text =
    `IP : ${ip}\n` +
    `🔎 Agent : ${ua}\n` +
    `🕓 Date : ${date} ${time}\n` +
    `©️ ${now.getFullYear()}`;

  // Envoi sur Telegram
  const payload = {
    chat_id: CHAT,
    text,
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