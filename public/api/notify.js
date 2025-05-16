// api/notify.js
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT  = process.env.CHAT_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message' });

  // Récupère IP et UA
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';

  // Compose le texte
  const now = new Date();
  const date = now.toLocaleString('fr-FR');
  const text = 
    `${message}\n\n` +
    `[🌐 IP] ${ip}\n` +
    `[📍 UA] ${ua}\n` +
    `[🕓 Date] ${date}`;

  // Envoi à Telegram
  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  const params = new URLSearchParams({
    chat_id: CHAT,
    text,
    parse_mode: 'Markdown'
  });

  try {
    const telegramRes = await fetch(`${url}?${params}`, { method: 'GET' });
    if (!telegramRes.ok) throw new Error(`Telegram status ${telegramRes.status}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telegram Error:', err);
    return res.status(500).json({ error: 'Telegram API error' });
  }
}