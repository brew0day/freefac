// api/notify.js
const TOKEN         = process.env.TELEGRAM_TOKEN;
const CHAT          = process.env.CHAT_ID;
const IPINFO_TOKEN  = process.env.IPINFO_TOKEN || '';

// -----------------------------------------------------------------------------
async function geoLookup(ip) {
  let isp = 'inconnue';
  let country = 'inconnue';
  let countryCode = '';

  try {
    const r = await fetch(`https://ipinfo.io/${ip}/json${IPINFO_TOKEN ? `?token=${IPINFO_TOKEN}` : ''}`);
    if (r.ok) {
      const d = await r.json();
      isp = d.org ? d.org.replace(/^AS\d+\s+/i, '') : isp;
      countryCode = d.country || countryCode;
      if (isp !== 'inconnue' || countryCode) return { isp, countryCode, country: countryCode };
    }
  } catch {}

  try {
    const r = await fetch(`https://ipwho.is/${ip}`);
    const d = await r.json();
    if (d.success) {
      isp = d.org || isp;
      return { isp, countryCode: d.country_code, country: d.country };
    }
  } catch {}

  try {
    const r = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,countryCode,isp`);
    const d = await r.json();
    if (d.status === 'success') {
      isp = d.isp ? d.isp.replace(/^AS\d+\s+/i, '') : isp;
      return { isp, countryCode: d.countryCode, country: d.country };
    }
  } catch {}

  return { isp, countryCode, country };
}

function fullCountryName(codeOrName) {
  if (!codeOrName) return 'inconnue';
  if (codeOrName.length === 2) {
    try { return new Intl.DisplayNames(['fr'], { type: 'region' }).of(codeOrName); }
    catch { return codeOrName; }
  }
  return codeOrName;
}

// -----------------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ----- Récupération robuste du message -------------------------------------
  let message = '';
  try {
    if (typeof req.body === 'string') {
      message = req.body.trim();                       // text/plain brut
    } else if (typeof req.body === 'object' && req.body !== null) {
      if (req.body.message) message = String(req.body.message).trim(); // JSON { message }
      else {
        const firstKey = Object.keys(req.body)[0];    // x-www-form-urlencoded: key=value
        if (firstKey) message = String(req.body[firstKey]).trim();
      }
    }
  } catch {}
  if (!message && typeof req.query.message === 'string') {
    message = req.query.message.trim();               // fallback ?message=xxx
  }
  if (!message) return res.status(400).json({ error: 'Missing message' });

  // IP & UA -------------------------------------------------------------------
  const forwarded = req.headers['x-forwarded-for'];
  const ip        = (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'inconnue';
  const ua        = req.headers['user-agent'] || 'inconnu';

  // Geo IP --------------------------------------------------------------------
  const { isp, countryCode, country } = await geoLookup(ip);
  const countryDisplay = fullCountryName(country || countryCode);

  // Date & heure --------------------------------------------------------------
  const now  = new Date();
  const date = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Message Telegram ----------------------------------------------------------
  const [header, ...rawLines] = message.split(/\n|\r|%0A/);
  let text = `📝 ${header.trim()}`;
  rawLines.forEach(l => { if (l.trim()) text += `\n${l.trim()}`; });
  text += `\n\n`;
  text += `🗓️ Date & heure : ${date}, ${time}`;
  text += `\n🌐 IP Client     : ${ip}`;
  text += `\n🔎 ISP Client    : ${isp}`;
  text += `\n🌍 Pays Client   : ${countryDisplay}`;
  text += `\n📍 User-Agent    : ${ua}`;
  text += `\n©️ ${now.getFullYear()} ©️`;

  // Envoi Telegram ------------------------------------------------------------
  const payload = { chat_id: CHAT, text, parse_mode: 'Markdown', disable_web_page_preview: true };
  const tg = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  });

  const raw = await tg.text();
  return res.status(tg.ok ? 200 : tg.status).json({ ok: tg.ok, full: raw });
}
