const http = require('http');

/**
 * Start a tiny HTTP control server on loopback that accepts
 * `POST /logout` with the shared secret header and forces the
 * WhatsApp Web client to log out and re-initialize (which triggers
 * a fresh QR).
 *
 * @param {object} opts
 * @param {import('whatsapp-web.js').Client} opts.client
 * @param {number} opts.port
 * @param {string} opts.secret
 * @param {(state: string, extra?: object) => Promise<void>} opts.pushStatus
 */
function startControlServer({ client, port, secret, pushStatus }) {
  if (!secret) {
    console.warn('[control] WAWEB_INTERNAL_SECRET not set — control server disabled');
    return;
  }

  const server = http.createServer(async (req, res) => {
    if (req.headers['x-waweb-secret'] !== secret) {
      res.writeHead(403).end('{"error":"forbidden"}');
      return;
    }
    if (req.method !== 'POST' || req.url !== '/logout') {
      res.writeHead(404).end('{"error":"not found"}');
      return;
    }

    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'logout initiated' }));

    console.log('[control] logout requested — tearing down client');
    try { await pushStatus('disconnected', { reason: 'admin-logout' }); } catch (_) {}
    try { await client.logout(); } catch (e) { console.warn('[control] logout err:', e.message); }
    try { await client.destroy(); } catch (e) { console.warn('[control] destroy err:', e.message); }
    setTimeout(() => {
      console.log('[control] re-initializing client');
      try { client.initialize(); } catch (e) { console.warn('[control] initialize err:', e.message); }
    }, 1000);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`[control] listening on 127.0.0.1:${port}`);
  });

  server.on('error', (err) => {
    console.warn('[control] server error:', err.message);
  });
}

module.exports = { startControlServer };
