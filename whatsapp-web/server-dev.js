require('dotenv').config();
const path = require('path');
const os = require('os');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const { startControlServer } = require('./lib/control');

const API_URL = process.env.API_URL || 'http://127.0.0.1:8000/api/whatsappweb';
const STATUS_URL = process.env.WAWEB_STATUS_URL || 'http://127.0.0.1:8000/api/whatsappweb/_internal/status';
const STATUS_SECRET = process.env.WAWEB_INTERNAL_SECRET || '';
const HEALTH_INTERVAL_MS = 30_000;
const STATUS_HEARTBEAT_MS = 10_000;
const CONTROL_PORT = parseInt(process.env.WAWEB_CONTROL_PORT || '3001', 10);

const SCRIPT_NAME = path.basename(process.argv[1] || 'server-dev.js');
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
  } catch (_) { /* silent */ }
}

let laravelOnline = false;

async function checkLaravel() {
  try {
    // Laravel responds to GET on the webhook route with 405 Method Not Allowed,
    // which still proves the app is up. Any 2xx/3xx/4xx means "server online".
    const res = await axios.get(API_URL, { timeout: 3000, validateStatus: () => true });
    const ok = res.status < 500;
    if (ok !== laravelOnline) {
      console.log(ok
        ? `[laravel] ONLINE (${API_URL}, http ${res.status})`
        : `[laravel] OFFLINE (${API_URL}, http ${res.status})`);
    }
    laravelOnline = ok;
  } catch (err) {
    if (laravelOnline !== false) {
      console.log(`[laravel] OFFLINE (${API_URL}, ${err.code || err.message})`);
    }
    laravelOnline = false;
  }
  return laravelOnline;
}

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
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
  console.log('WhatsApp bot dah siap dan online (dev / Windows)');
  pushStatus('connected');
});

client.on('auth_failure', m => {
  pushStatus('auth_failure', { reason: String(m) });
});

client.on('disconnected', r => {
  pushStatus('disconnected', { reason: String(r) });
});

client.on('message', async msg => {
  if (!laravelOnline) {
    // Re-check on demand in case the 30s tick hasn't caught up yet.
    await checkLaravel();
  }
  if (!laravelOnline) {
    console.warn(`[skip] Laravel offline — message from ${msg.from} not forwarded`);
    return;
  }

  try {
    const payload = {
      from: msg.from,
      body: msg.body,
      timestamp: msg.timestamp,
      isGroup: msg.from.includes('@g.us'),
      type: msg.type,
      hasMedia: msg.hasMedia
    };

    if (msg.hasMedia) {
      const media = await msg.downloadMedia();
      if (media) {
        payload.media = {
          mimetype: media.mimetype,
          filename: media.filename || null,
          data: media.data
        };
      }
    }

    const response = await axios.post(API_URL, payload, { timeout: 20_000 });
    const message = response.data.message;

    if (message && message !== '') {
      const delay = Math.floor(Math.random() * 2000) + 1000;
      setTimeout(async () => {
        await client.sendMessage(msg.from, message);
      }, delay);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      laravelOnline = false;
      console.warn(`[laravel] connection failed (${error.code}) — marked offline`);
    } else {
      console.warn(error.message);
    }
  }
});

(async () => {
  await checkLaravel();
  setInterval(checkLaravel, HEALTH_INTERVAL_MS);
  pushStatus('booting');
  setInterval(() => pushStatus('__heartbeat__'), STATUS_HEARTBEAT_MS);
  startControlServer({ client, port: CONTROL_PORT, secret: STATUS_SECRET, pushStatus });
  client.initialize();
})();
