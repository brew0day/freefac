/* tg-client.js – version clean, front = ▶️ /api/notify uniquement */

/* 1. Mini-journal ---------------------------------------------------------- */
function addToJournal(txt) {
  const pre = document.createElement('pre');
  pre.textContent = txt;
  document.getElementById('log').prepend(pre);
}

/* 2. Envoi brut vers /api/notify ------------------------------------------ */
async function sendNotificationToServer(message) {
  addToJournal('→ REQ\n' + message);

  try {
    const r   = await fetch('/api/notify', {
      method : 'POST',
      headers: { 'Content-Type': 'text/plain' }, // texte brut (OK Safari)
      body   : message
    });
    const raw = await r.text();
    addToJournal('← RESP ' + r.status + '\n' + raw);
  } catch (err) {
    addToJournal('‼︎ ERREUR FETCH\n' + err);
  }
}

/* 3. Export global --------------------------------------------------------- */
window.sendNotificationToServer = sendNotificationToServer;