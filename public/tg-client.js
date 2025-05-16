// tg-client.js
async function sendNotificationToServer(message) {
  logDebug('📤 Envoi au server: ' + message.replace(/\n/g,' | '));
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    const data = await res.json();
    if (!res.ok) {
      // Ici vous verrez le `description` renvoyé par Telegram
      logDebug(`❌ Server ${res.status}: ${data.description || data.error} — full: ${JSON.stringify(data.full||data)}`);
    } else {
      logDebug('✅ Server OK: ' + JSON.stringify(data.full||data));
    }
  } catch (e) {
    logDebug('❌ Erreur server: ' + e);
  }
}