JAIS AI
---
1. User Management API 
2. Api Token Management
3. Api Usage Logs

Install Laragon for Windows

API Folder
---
0. composer install
1. cp env.example to .env (Linux) atau cp ".env.example" ".env" (Windows)
1. php artisan key:generate
2. create database
3. php artisan migrate
4. php artisan db:seed
5. php artisan serve

6. php artisan config:clear
7. php artisan cache:clear
8. php artisan config:cache
9. php artisan queue:work

Frontend Folder
---
0. npm install
1. cp env.example as .env (linux) untuk cp ".env.example" ".env" (Windows)
2. npm start

NGROK
---
1. Register NGROK static domain
2. Run Laravel at port 8000
3. ngrok http --url=parrot-poetic-squirrel.ngrok-free.app 8000

META BUSINESS
---

WhatsAppWeb JS folder
---
1. npm install
2. node server-prod.js
3. scan QR code guna phone Linked Devices dalam app WhatsApp
4. guna phone lain mesej wasap 'hello'

### Flow: WhatsApp message → server-prod.js → Laravel → OpenAI → reply

End-to-end pipeline when a user sends a WhatsApp message to the linked phone:

1. **Node bridge receives** — `whatsapp-web/server-prod.js` (Puppeteer + `whatsapp-web.js` + LocalAuth) fires `client.on('message')`.
2. **Build payload** — `{ from, body, timestamp, isGroup, type, hasMedia, media? }`. If `msg.hasMedia`, `msg.downloadMedia()` attaches `{ mimetype, filename, data(base64) }`.
3. **POST to Laravel** — `axios.post(API_URL, payload)` where `API_URL` comes from `whatsapp-web/.env` (default `http://127.0.0.1:8000/api/whatsappweb`).
4. **Route** — `POST /api/whatsappweb` → `App\Http\Controllers\WhatsApp\WhatsappWebController@handle` (registered in `api/routes/api.php`). Validates the payload.
5. **Media branch** — if `hasMedia` and mimetype is `jpg/jpeg/png`, base64-decodes and saves to `api/storage/app/public/whatsapp_media/` with filename `wa_<ts>_<rand>.<ext>`, then returns early with `{ status: saved, path }`. Other mimetypes return `{ status: ignored }`.
6. **Persist inbound** — stores a `ChatMessage` row (`channel=whatsapp_web`, `chat_id=from`, `role=user`, `content=body`).
7. **Build context** — pulls last 10 `ChatMessage`s for this `chat_id`, reverses to chronological order, prepends a `system` message from `config('llm.complaint_system_prompt')`.
8. **Call OpenAI** — POST to `https://api.openai.com/v1/chat/completions` with `model: gpt-4.1-mini` using `OPENAI_API_KEY` from `.env`. Errors are logged and the handler returns silently (no reply).
9. **Persist outbound** — saves the LLM reply as a `ChatMessage` row (`role=assistant`).
10. **Command detection** — if the LLM reply starts with `/store_complaint`, the JSON payload after the command is parsed and a `Complaint` row is created (`reference_no = JAIS-YYYY-XXXXXX`, `channel = whatsapp_web`, `current_stage = baru`). Chat history for this `chat_id` is then deleted, and the response becomes "Aduan anda telah berjaya diterima. Ini nombor rujukan aduan : {ref}".
11. **HTTP response** — controller returns `{ status: ok, message: <reply> }`.
12. **Reply back to WhatsApp** — Node bridge reads `response.data.message`, waits a random 1–3s, calls `client.sendMessage(msg.from, message)`.

Key files:
- Node bridge: `whatsapp-web/server-prod.js`
- Controller: `api/app/Http/Controllers/WhatsApp/WhatsappWebController.php`
- Route: `api/routes/api.php` → `Route::post('/whatsappweb', ...)`
- Model: `api/app/Models/ChatMessage.php`, `api/app/Models/Complaint.php`
- System prompt: `api/config/llm.php` → `complaint_system_prompt`

Separate path — **Meta Cloud API webhook** (`POST /api/whatsapp` → `WhatsApp\WebhookController`) is a different integration that uses Meta's official Graph API and webhook, not the Node bridge.

GitHub Webhook Auto-Deploy
---
1. Set `GITHUB_WEBHOOK_SECRET` in `api/.env`
2. Set the same secret in GitHub repo > Settings > Webhooks
3. Payload URL: `https://yourdomain.com/api/github-webhook`
4. Content type: `application/json`
5. Events: Just the push event

Link download Laragon:
https://io.bikegremlin.com/35435/laragon-6-php-8-4-install/

