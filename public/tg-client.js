// tg-client.js
/**
 * Envoie le message JSON à votre Serverless Function /api/notify
 * et logue dans le panneau debug.
 */
function logDebug(msg) {
  const panel = document.getElementById('debug-panel');
  if (!panel) return;
  const d = new Date();
  const time = d.toTimeString().slice(0,8);
  const line = document.createElement('div');
  line.textContent = `[${time}] ${msg}`;
  panel.appendChild(line);
  panel.scrollTop = panel.scrollHeight;
}

async function sendNotificationToServer(message) {
  logDebug('Envoi au server: ' + message.replace(/\n/g,' | '));
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
    logDebug('✅ Server a accepté la requête');
  } catch (e) {
    logDebug('❌ Erreur server: ' + e);
  }
}

window.sendNotificationToServer = sendNotificationToServer;