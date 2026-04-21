require('dotenv').config();
const path = require('path');
const os = require('os');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const { startControlServer } = require('./lib/control');

const API_URL = process.env.API_URL || 'http://127.0.0.1:8000/api/whatsappweb';
const CHROMIUM_PATH = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';

// Status-ingest endpoint on Laravel (loopback). Guarded by shared secret.
const STATUS_URL = process.env.WAWEB_STATUS_URL || 'http://127.0.0.1:8000/api/whatsappweb/_internal/status';
const STATUS_SECRET = process.env.WAWEB_INTERNAL_SECRET || '';
const HEARTBEAT_MS = 10_000;
const CONTROL_PORT = parseInt(process.env.WAWEB_CONTROL_PORT || '3001', 10);

const SCRIPT_NAME = path.basename(process.argv[1] || 'server-prod.js');
const PLATFORM = os.platform();

async function pushStatus(state, extra = {}) {
  if (!STATUS_SECRET) return;
  try {
    await axios.post(STATUS_URL, {
      state,
      qr: extra.qr || null,
      reason: extra.reason || null,
      pid: process.pid,
      platform: PLATFORM,
      script: SCRIPT_NAME,
      ts: Date.now(),
    }, {
      headers: { 'X-WAWEB-SECRET': STATUS_SECRET },
      timeout: 3000,
    });
  } catch (_) {
    // Silent: we never want status-push failures to crash the bot.
  }
}

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
  pushStatus('waiting-for-scan', { qr });
});

client.on('authenticated', () => {
  pushStatus('authenticated');
});

client.on('ready', () => {
  console.log('WhatsApp bot dah siap dan online');
  pushStatus('connected');
});

client.on('auth_failure', msg => {
  pushStatus('auth_failure', { reason: String(msg) });
});

client.on('disconnected', reason => {
  pushStatus('disconnected', { reason: String(reason) });
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

pushStatus('booting');
setInterval(() => pushStatus('__heartbeat__'), HEARTBEAT_MS);
startControlServer({ client, port: CONTROL_PORT, secret: STATUS_SECRET, pushStatus });
client.initialize();
