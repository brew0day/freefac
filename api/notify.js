// api/notify.js

const TOKEN        = process.env.TELEGRAM_TOKEN;
const CHAT         = process.env.CHAT_ID;
const IPINFO_TOKEN = process.env.IPINFO_TOKEN || '';

export const config = {
  api: {
    // On désactive le bodyParser Next.js par défaut pour pouvoir
    // lire aussi bien du JSON que du texte brut
    bodyParser: false,
  },
};

async function geoLookup(ip) {
  // ... (ta fonction geoLookup inchangée)
}

function fullCountryName(codeOrName) {
  // ... (ta fonction fullCountryName inchangée)
}

// helper pour lire le body qu’il soit JSON ou texte
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
      // si JSON invalide, retomber sur le texte brut
    }
  }
  // on renvoie le raw string (texte brut)
  return raw;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const message = (await readBody(req)).trim();
  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  // IP + UA + date/heure
  const forwarded = req.headers['x-forwarded-for'];
  const ip        = (forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'inconnue';
  const ua        = req.headers['user-agent'] || 'inconnu';
  const { isp, countryCode, country } = await geoLookup(ip);
  const countryDisplay = fullCountryName(country || countryCode);
  const now  = new Date();
  const date = now.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Construction du texte brut (correspond à ton exemple)
  const [header, ...rawLines] = message.split('\n');
  let text = `${header.trim()}`;

  rawLines.forEach(l => {
    if (!l.trim()) return;
    text += `\n${l.trim()}`;
  });

  text += `\n\n[${time}] ✅ Server OK`;
  text += `\nDate & heure  : ${date}, ${time}`;
  text += `\nIP Client     : ${ip}`;
  text += `\nISP Client    : ${isp}`;
  text += `\nPays Client   : ${countryDisplay}`;
  text += `\nUser-Agent    : ${ua}`;

  // Envoi en texte brut
  const payload = {
    chat_id: CHAT,
    text,
    disable_web_page_preview: true,
    // **pas** de parse_mode → Telegram interprétera tout en plain text
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