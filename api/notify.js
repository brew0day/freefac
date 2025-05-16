// api/notify.js
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT  = process.env.CHAT_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  // Récupère IP + User-Agent
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';

  // Compose le texte final
  const now  = new Date();
  const date = now.toLocaleString('fr-FR');
  const text =
    `${message}\n\n` +
    `🌐 IP: ${ip}\n` +
    `📍 UA: ${ua}\n` +
    `🕓 Date: ${date}`;

  // Prépare l’appel POST JSON à Telegram
  const url     = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  const payload = {
    chat_id: CHAT,
    text,
    disable_web_page_preview: true
  };

  // Envoi de la requête
  const telegramRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Lit la réponse en texte
  const raw = await telegramRes.text();
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    body = raw;
  }

  // Renvoie la réponse brute pour debug
  const statusCode = telegramRes.ok ? 200 : telegramRes.status;
  return res.status(statusCode).json({
    ok: telegramRes.ok,
    description: typeof body === 'object' ? body.description : undefined,
    full: body
  });
}