// api/notify.js

const TOKEN        = process.env.TELEGRAM_TOKEN;
const CHAT         = process.env.CHAT_ID;
const IPINFO_TOKEN = process.env.IPINFO_TOKEN || '';

export const config = {
  api: {
    bodyParser: false,  // on gère nous-mêmes la lecture du body
  },
};

async function geoLookup(ip) {
  let isp = 'inconnue';
  let country = 'inconnue';
  let countryCode = '';

  // 1️⃣ ipinfo.io
  try {
    const r = await fetch(
      `https://ipinfo.io/${ip}/json${IPINFO_TOKEN ? `?token=${IPINFO_TOKEN}` : ''}`
    );
    if (r.ok) {
      const d = await r.json();
      if (d.org) isp = d.org.replace(/^AS\d+\s+/i, '');
      if (d.country) {
        countryCode = d.country;
        country = countryCode;
      }
      return { isp, countryCode, country };
    }
  } catch {}

  // 2️⃣ ipwho.is
  try {
    const r = await fetch(`https://ipwho.is/${ip}`);
    const d = await r.json();
    if (d.success) {
      isp = d.org || isp;
      country = d.country || country;
      return { isp, countryCode: d.country_code, country };
    }
  } catch {}

  // 3️⃣ ip-api.com
  try {
    const r = await fetch(
      `https://ip-api.com/json/${ip}?fields=status,country,countryCode,isp`
    );
    const d = await r.json();
    if (d.status === 'success') {
      isp = d.isp.replace(/^AS\d+\s+/i, '') || isp;
      country = d.country || country;
      countryCode = d.countryCode;
      return { isp, countryCode, country };
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
    } catch {}
  }
  return codeOrName;
}

export default async function handler(req, res) {
  // 1️⃣ CORS pour Safari (pré-flight)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2️⃣ IP + UA
  const forwarded = req.headers['x-forwarded-for'];
  const ip        = (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'inconnue';
  const ua        = req.headers['user-agent'] || 'inconnu';

  // 3️⃣ Geo
  const { isp, countryCode, country } = await geoLookup(ip);
  const countryDisplay = fullCountryName(country || countryCode);

  // 4️⃣ Date & heure
  const now  = new Date();
  const date = now.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
  const time = now.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  // 5️⃣ Construction du plain text
  const text =
    `IP : ${ip}\n` +
    `- ISP Client   : ${isp}\n` +
    `- Pays Client  : ${countryDisplay}\n` +
    `- User-Agent   : ${ua}\n` +
    `- Date & heure : ${date} ${time}\n` +
    `©️ ${now.getFullYear()}`;

  // 6️⃣ Envoi sur Telegram
  const payload = {
    chat_id: CHAT,
    text,
    disable_web_page_preview: true
  };

  const tg = await fetch(
    `https://api.telegram.org/bot${TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  const raw = await tg.text();
  return res.status(tg.ok ? 200 : tg.status).json({ ok: tg.ok, full: raw });
}