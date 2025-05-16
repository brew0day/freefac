// api/notify.js
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT  = process.env.CHAT_ID;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  // Récupère IP + UA
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';

  // Construit le texte
  const now  = new Date();
  const date = now.toLocaleString('fr-FR');
  const text =
    `${message}\n\n` +
    `🌐 IP: ${ip}\n` +
    `📍 UA: ${ua}\n` +
    `🕓 Date: ${date}`;

  // POST JSON à Telegram (sans parse_mode)
  const url     = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  const payload = { chat_id: CHAT, text, disable_web_page_preview: true };

  // Envoie la requête
  const telegramRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Tente de parser la réponse JSON
  let body;
  try {
    body = await telegramRes.json();
  } catch (err) {
    // Si ce n’est pas du JSON, retourne le texte brut
    const textBody = await telegramRes.text();
    return res
      .status(telegramRes.status || 500)
      .json({ error: 'Non-JSON response from Telegram', body: textBody });
  }

  // **Ne jamais renvoyer 500 ici** : on veut toujours renvoyer la réponse Telegram pour debug
  const statusCode = telegramRes.ok ? 200 : telegramRes.status;
  return res.status(statusCode).json({ ok: body.ok, description: body.description, full: body });
};