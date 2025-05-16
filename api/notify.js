// api/notify.js
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT  = process.env.CHAT_ID;

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { message } = req.body;
    if (!message) {
      console.error('❌ Missing message in body');
      return res.status(400).json({ error: 'Missing message' });
    }

    // Récup IP + UA
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';

    // Compose le texte final
    const now = new Date();
    const date = now.toLocaleString('fr-FR');
    const text =
      `${message}\n\n` +
      `🌐 IP: ${ip}\n` +
      `📍 UA: ${ua}\n` +
      `🕓 Date: ${date}`;

    // Appel POST JSON à Telegram
    const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
    const payload = {
      chat_id: CHAT,
      text,
      parse_mode: 'Markdown'
    };

    console.log('➡️ POST to Telegram API:', url, payload);
    const telegramRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await telegramRes.json();
    if (!telegramRes.ok) {
      console.error('❌ Telegram API responded error:', body);
      return res.status(500).json({ error: 'Telegram API error', details: body });
    }

    console.log('✅ Telegram API success:', body);
    return res.status(200).json({ ok: true, result: body });
  } catch (err) {
    console.error('🔥 Unexpected error in /api/notify:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
};