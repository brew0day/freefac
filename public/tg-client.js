// tg-client.js

/**
 * Affiche un message dans le panneau debug en bas de page.
 * Doit être chargé AVANT tout appel à sendNotificationToServer().
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

async function sendNotificationToServer(message) {
  logDebug('📤 Envoi au server: ' + message.replace(/\n/g,' | '));
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = await res.text();
    }
    if (!res.ok) {
      logDebug(`❌ Server ${res.status}: ${JSON.stringify(data)}`);
    } else {
      logDebug('✅ Server OK: ' + JSON.stringify(data));
    }
  } catch (e) {
    logDebug('❌ Erreur server: ' + e);
  }
}

// On expose la fonction pour l’appel depuis index.html
window.sendNotificationToServer = sendNotificationToServer;