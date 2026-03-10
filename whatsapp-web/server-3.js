require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://127.0.0.1:8000/api/whatsappweb';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: CHROMIUM_PATH,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  }
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp bot dah siap dan online');
});

client.on('message', async msg => {

  try {

    let payload = {
      from: msg.from,
      body: msg.body,
      timestamp: msg.timestamp,
      isGroup: msg.from.includes('@g.us'),
      type: msg.type,
      hasMedia: msg.hasMedia
    };

    // Jika ada media
    if (msg.hasMedia) {
      const media = await msg.downloadMedia();

      if (media) {
        payload.media = {
          mimetype: media.mimetype,
          filename: media.filename || null,
          data: media.data // base64
        };
      }
    }

    const response = await axios.post(API_URL, payload);

    const message = response.data.message;

    if (message && message !== '') {

      const delay = Math.floor(Math.random() * 2000) + 1000;

      setTimeout(async () => {
        await client.sendMessage(msg.from, message);
      }, delay);
    }

  } catch (error) {
    console.warn(error);
  }

});

client.initialize();