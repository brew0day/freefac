// tg-client.js

/**
 * Affiche un message dans le panneau debug.
 */
function logDebug(msg) {
  const panel = document.getElementById('debug-panel');
  if (!panel) return;
  const time = new Date().toTimeString().slice(0,8);
  const line = document.createElement('div');
  line.textContent = `[${time}] ${msg}`;
  panel.appendChild(line);
  panel.scrollTop = panel.scrollHeight;
}

/**
 * Envoie le message à /api/notify et décode proprement la réponse.
 */
async function sendNotificationToServer(message) {
  logDebug('📤 Envoi au server: ' + message.replace(/\n/g,' | '));
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    // On lit une seule fois le body en texte
    const text = await res.text();

    // Puis on essaie de parser en JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      data = text;
    }

    if (!res.ok) {
      logDebug(`❌ Server ${res.status}: ${typeof data === 'object' ? JSON.stringify(data) : data}`);
    } else {
      logDebug(`✅ Server OK: ${typeof data === 'object' ? JSON.stringify(data) : data}`);
    }

  } catch (e) {
    logDebug('❌ Erreur server: ' + e);
  }
}

window.sendNotificationToServer = sendNotificationToServer;