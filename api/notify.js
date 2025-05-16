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

  // Récupère IP + User-Agent
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'unknown';
  const ua = req.headers['user-agent'] || 'unknown';

  // Compose le texte final (plain text)
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

  // Tente de parser la réponse JSON
  let body;
  try {
    body = await telegramRes.json();
  } catch (err) {
    const textBody = await telegramRes.text();
    console.error('❌ Telegram non-JSON response:', textBody);
    return res
      .status(telegramRes.status || 500)
      .json({ ok: false, error: 'Non-JSON response from Telegram', body: textBody });
  }

  // Renvoie toujours le JSON de Telegram pour debugging
  if (!telegramRes.ok) {
    console.error('❌ Telegram API error', telegramRes.status, body);
    return res
      .status(telegramRes.status)
      .json({ ok: false, description: body.description, full: body });
  }

  console.log('✅ Telegram API success', body);
  return res.status(200).json({ ok: true, full: body });
};