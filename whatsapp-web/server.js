const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp bot dah siap dan online');
});

client.on('message', async msg => {
  // reply logic
  if (msg.body === 'ping') {
    await msg.reply('pong');
  }

  // webhook logic
  try {
    await axios.post('http://localhost:8000/api/whatsappweb', {
      from: msg.from,
      body: msg.body,
      timestamp: msg.timestamp,
      isGroup: msg.from.includes('@g.us')
    });
    console.log('Message sent to webhook');
  } catch (err) {
    console.error('Webhook error:', err.message);
  }
});

client.initialize();
