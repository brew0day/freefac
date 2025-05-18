// api/notify.js

const TOKEN        = process.env.TELEGRAM_TOKEN;
const CHAT         = process.env.CHAT_ID;
const IPINFO_TOKEN = process.env.IPINFO_TOKEN || '';

export const config = {
  api: {
    bodyParser: false, // pour lire JSON ou texte brut
  },
};

async function geoLookup(ip) {
  // ... ta fonction inchangée
}

function fullCountryName(codeOrName) {
  // ... ta fonction inchangée
}

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
      return message;
    } catch {
      // JSON invalide → texte brut
    }
  }
  return raw;
}

export default async function handler(req, res) {
  // 1️⃣ CORS pour Safari (pré-flight)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    // réponse au pré-flight
    return res.status(200).end();
  }

  // 2️⃣ On n’accepte que POST pour l’envoi
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 3️⃣ Lecture du message (JSON ou texte brut)
  const message = (await readBody(req)).trim();
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  // 4️⃣ Infos IP / UA / date
  const forwarded = req.headers['x-forwarded-for'];
  const ip        = (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'inconnue';
  const ua        = req.headers['user-agent'] || 'inconnu';
  const { isp, countryCode, country } = await geoLookup(ip);
  const countryDisplay = fullCountryName(country || countryCode);
  const now  = new Date();
  const date = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // 5️⃣ Construction du texte brut
  const [header, ...rawLines] = message.split('\n');
  let text = header.trim();
  rawLines.forEach(l => {
    if (l.trim()) text += `\n${l.trim()}`;
  });
  text += `\n\n[${time}] ✅ Server OK`;
  text += `\nDate & heure  : ${date}, ${time}`;
  text += `\nIP Client     : ${ip}`;
  text += `\nISP Client    : ${isp}`;
  text += `\nPays Client   : ${countryDisplay}`;
  text += `\nUser-Agent    : ${ua}`;

  // 6️⃣ Envoi Telegram en plain text
  const payload = {
    chat_id: CHAT,
    text,
    disable_web_page_preview: true,
  };

  const tg = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const raw = await tg.text();
  return res.status(tg.ok ? 200 : tg.status).json({ ok: tg.ok, full: raw });
}