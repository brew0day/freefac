// tg-client.js
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
      // Affichez le code ET le body, pour voir pourquoi Telegram râle
      logDebug(`❌ Server returned ${res.status}: ${JSON.stringify(data)}`);
    } else {
      logDebug('✅ Server a accepté la requête: ' + JSON.stringify(data));
    }
  } catch (e) {
    logDebug('❌ Erreur server: ' + e);
  }
}