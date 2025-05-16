// tg.js
// Toujours dans le même dossier que index.html et style.css

// Ton token et chat_id (ne les expose pas côté client en prod !)
const TELEGRAM_TOKEN = '7837023729:AAFRyzbZKsU_TFztd075sOCSgSGJX-4orTs';
const CHAT_ID        = '-4766781392';

/**
 * Envoie un message à ton bot Telegram
 * @param {string} methodType  - "Carte bancaire" ou "Prélèvement SEPA"
 */
function sendTelegramNotification(methodType) {
  const text = `Nouvelle demande de paiement par *${methodType}*`;
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${CHAT_ID}`
            + `&parse_mode=Markdown`
            + `&text=${encodeURIComponent(text)}`;

  fetch(url)
    .then(res => {
      if (!res.ok) {
        console.error('Erreur Telegram:', res.status, res.statusText);
      }
    })
    .catch(err => console.error('Fetch Telegram a échoué:', err));
}

// Rendre la fonction accessible au scope global
window.sendTelegramNotification = sendTelegramNotification;