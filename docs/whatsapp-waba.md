# Meta WhatsApp Business API (WABA) — Implementation Reference

How the official Meta Cloud API (Graph API) WhatsApp integration is wired into
this project. Written for engineers who need to modify, debug, or extend the
inbound → LLM → outbound pipeline.

> This document covers **Meta WABA (Cloud API)** only. The repo has a separate
> integration in `whatsapp-web/` that uses an unofficial Puppeteer-based
> `whatsapp-web.js` bridge — that is out of scope here.
> See the root `README.md` for the whatsapp-web pipeline.

---

## 1. Overview

Meta pushes user WhatsApp messages to `POST /api/whatsapp`. The controller queues
a job that runs the message through OpenAI, persists conversation state, and —
if the LLM emits a `/store_complaint {json}` command — creates a `Complaint` row
and replies to the user with a reference number. Text out is a plain
`graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages` POST.

There is no interactive/template/media support in the current implementation —
text only, both directions.

```
Meta Cloud API                                 OpenAI
     │                                            ▲
     │ POST /api/whatsapp                         │ chat/completions
     ▼                                            │
WebhookController::handleWebhook   →  SendToLlmJob (queue)
     │                                            │
     │ dispatch                                   ▼
     └────────────────────────────────►  LlmComplaintService::handleIncoming
                                                  │
                                                  │  persist ChatMessage rows
                                                  │  build system+history+user msg
                                                  │  call OpenAI
                                                  │  detect /store_complaint
                                                  ▼
                                          Complaint row (if command)
                                          + wipe chat_messages
                                                  │
                     Meta Graph API   ◄───  SendToLlmJob::sendToWhatsApp
                     (v19.0 /messages)
```

---

## 2. Component Map

| File | Responsibility |
|---|---|
| `api/routes/api.php` (lines ~419–422) | Registers `GET`/`POST /api/whatsapp` |
| `api/app/Http/Controllers/WhatsApp/WebhookController.php` | Handshake verify + inbound webhook receipt |
| `api/app/Jobs/SendToLlmJob.php` | Async LLM dispatch (shared with Telegram) |
| `api/app/Services/LlmComplaintService.php` | LLM orchestration + complaint persistence |
| `api/app/Services/ComplaintReferenceService.php` | Generates `reference_no` |
| `api/app/Models/ChatMessage.php` | Conversation history rows |
| `api/app/Models/Complaint.php` | Stored complaint records |
| `api/config/services.php` (lines 42–46) | WABA credentials from env |
| `api/config/llm.php` | System prompt (Malay), conversation rules |
| `api/database/migrations/2025_12_16_000000_create_chat_messages_table.php` | `chat_messages` schema |

**Not part of the WABA path** (do not confuse):
- `api/app/Http/Controllers/WhatsApp/WhatsappWebController.php` — whatsapp-web bridge
- `api/app/Http/Controllers/Admin/WhatsappWebStatusController.php` — bridge status
- `api/app/Http/Middleware/VerifyWhatsappWebSecret.php` — bridge auth
- `api/app/Jobs/WhatsAppSendToLlmJob.php` — earlier/parallel implementation, not
  dispatched by `WebhookController` (the WABA path uses `SendToLlmJob`)

---

## 3. Inbound Path

### 3.1 Verification handshake — `GET /api/whatsapp`

`WebhookController::verify()` (lines 19–32). Meta calls this once when you
subscribe the webhook in the App Dashboard. Query params:

- `hub.mode` → must be `subscribe`
- `hub.verify_token` → must equal `config('services.whatsapp.verify_token')` (env `WHATSAPP_VERIFY_TOKEN`)
- `hub.challenge` → random string that must be echoed back verbatim

Returns plain-text `challenge` with status 200 on match, `Forbidden` 403 otherwise.
No JSON, no HMAC.

Note: Laravel maps dotted query keys (`hub.mode`) to underscored ones
(`hub_mode`) via `$request->query('hub_mode')`. That's why the code reads
`hub_mode` even though Meta sends `hub.mode`.

### 3.2 Message receipt — `POST /api/whatsapp`

`WebhookController::handleWebhook()` (lines 34–73). Fully public route — no
middleware, no signature check.

**Payload shape (Meta Cloud API v19):**

```json
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "60123456789",
          "id": "wamid.xxx",
          "type": "text",
          "text": { "body": "hi" }
        }],
        "contacts": [{
          "profile": { "name": "Ahmad" }
        }]
      }
    }]
  }]
}
```

**What the controller does:**

1. Logs the entire payload at INFO level (see §7 for the PII concern).
2. Extracts `text.body` → `strtolower(trim(...))` → `$message`.
3. Extracts `from` → `$from` (the user's WhatsApp phone number in E.164 without `+`).
4. If either is missing, returns `{"status":"ignored"}` with 200.
5. If `$message` is one of `/reset`, `reset`, `/batal`, `batal`, calls
   `LlmComplaintService::resetHistory('whatsapp-meta', $from)`, replies
   `"Perbualan dikosongkan. Sila mula semula."`, returns.
6. Builds `$hints`:
   - `name` from `contacts[0].profile.name` (if present)
   - `phone` from `$from` with leading `60` replaced by `0` (Malaysian local format)
7. Dispatches `SendToLlmJob($message, $from, 'whatsapp-meta', $hints)` and
   returns `{"status":"ok"}` immediately (Meta needs a fast 200).

---

## 4. Outbound Path

Two identical implementations exist:

- `WebhookController::sendMessage()` (lines 75–89) — used for the reset ack
- `SendToLlmJob::sendToWhatsApp()` (lines 144–158) — used for LLM replies

Both POST to:

```
https://graph.facebook.com/v19.0/{WHATSAPP_PHONE_NUMBER_ID}/messages
Authorization: Bearer {WHATSAPP_ACCESS_TOKEN}
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "to": "60123456789",
  "type": "text",
  "text": { "body": "..." }
}
```

Notes:
- API version `v19.0` is hardcoded in both places.
- No retry, no timeout, no error handling. Failed sends are dropped silently.
- Template messages, media, interactive replies, reactions — not implemented.

---

## 5. LLM Orchestration (`LlmComplaintService`)

Constants (top of class):

```
HISTORY_LIMIT = 10
MODEL         = 'gpt-4.1-mini'
ENDPOINT      = https://api.openai.com/v1/chat/completions
TIMEOUT       = 15 (seconds)
```

### 5.1 `handleIncoming($channel, $chatId, $userMessage, $hints)`

Called from `SendToLlmJob::handle()`. For WABA: `channel='whatsapp-meta'`,
`chatId=$from`.

1. Insert `ChatMessage(role='user', content=$userMessage)`.
2. Call `askOpenAi()` (see 5.2). If null, return null (no reply sent).
3. Insert `ChatMessage(role='assistant', content=$reply)`.
4. If `$reply` starts with `/store_complaint`, call `storeComplaint()` (see 5.3):
   - Success: returns `"Aduan anda telah berjaya diterima. Ini nombor rujukan
     aduan : {ref}\n\nSemak status aduan di: {APP_URL}/semak-status"`
   - Failure: returns `"Maaf, terdapat ralat semasa menyimpan aduan..."`
5. Otherwise returns `$reply` as-is.

The returned string is what `SendToLlmJob::handle()` then pushes back to WhatsApp.

### 5.2 `askOpenAi($channel, $chatId, $hints)`

1. Reads `OPENAI_API_KEY` via `config('services.openai.api_key')`. If missing,
   logs error and returns null.
2. Fetches the last 10 `ChatMessage` rows for this channel+chatId, ordered
   `latest()` then `reverse()`'d — i.e. oldest → newest in the array.
3. Builds `$messages`:
   - **First system message:** `config('llm.complaint_system_prompt')` (the
     Malay flow definition — see §6).
   - **Second system message (only if hints present):** injects
     `"MAKLUMAT PENGGUNA YANG TELAH DIKENAL: - Nama pengguna: ... - Nombor
     telefon: ..."` and instructs the LLM to use as defaults but confirm with
     the user before submitting.
   - **History:** the 10 rows.
4. POSTs to OpenAI with `Bearer {OPENAI_API_KEY}`, 15s timeout.
5. Returns `choices[0].message.content` or null on non-2xx.

Important consequence of `strtolower()` in the controller (step 3.2 above): the
user's messages are stored lowercased in `chat_messages`. Names, IC numbers,
and addresses all lose their case in transit. The LLM sees `"ahmad bin ali"`,
`"petaling jaya"`, etc.

### 5.3 `storeComplaint($channel, $chatId, $message, $hints)`

Called when the LLM's reply is a `/store_complaint {json}` command.

1. `substr` off the command prefix and `json_decode` the rest. If invalid,
   logs warning and returns null.
2. Generates `$referenceNo` via `ComplaintReferenceService::generateReferenceNo('AJ', $data['district'] ?? null, now())`.
3. Inserts a `Complaint` row (see mapping below).
4. Deletes all `ChatMessage` rows for this `channel + chat_id` — the
   conversation is wiped after a successful submission.
5. Returns `$referenceNo`.

**Field mapping from LLM JSON → `complaints` table:**

| LLM key | `complaints` column | Fallback |
|---|---|---|
| `name` | `complainant_name` | `hints['name']` → `'Tidak dinyatakan'` |
| `identification_number` | `identification_number` | `'Tidak dinyatakan'` |
| `contact_number` | `contact_number` | `hints['phone']` → `$chatId` (raw `from`) |
| `location` | `address` | `'Tidak dinyatakan'` |
| `district` | `district_name` | `null` |
| `contents` | `summary` | `'Tidak dinyatakan'` |
| — (fixed) | `case_type` | `'AJ'` |
| — (fixed) | `channel` | `'whatsapp-meta'` |
| — (fixed) | `current_stage` | `'baru'` |
| `now()` | `complaint_year`, `complaint_date`, `complaint_time`, `submitted_at` | — |

Note: the system prompt doesn't ask the user for a district, so
`district_name` is typically null and `generateReferenceNo` gets a null
district. Check `ComplaintReferenceService` for how that's handled.

### 5.4 `resetHistory($channel, $chatId)`

One-liner: `DELETE FROM chat_messages WHERE channel=? AND chat_id=?`. Called
by the controller on `/reset`/`/batal` and by `storeComplaint` after a
successful submission.

---

## 6. System Prompt

Lives in `api/config/llm.php` under `complaint_system_prompt`. In Malay.
Summary of the flow it encodes:

1. **Intro:** identify as JAIS AI assistant, offer two options —
   (1) JAIS info, (2) submit a complaint.
2. **Option 1:** print a fixed block with JAIS address, phone, email.
3. **Option 2 (complaint):** ask five questions **one at a time, in order**:
   1. Nama penuh
   2. Nombor kad pengenalan
   3. Nombor telefon
   4. Lokasi kejadian
   5. Butiran aduan
4. When all five are collected, display a summary and ask for `ya/tidak`
   confirmation.
5. On `tidak`: wipe collected info, restart.
6. On `ya`: emit a **single line** in this exact format:
   ```
   /store_complaint {"name":"...","identification_number":"...","contact_number":"...","location":"...","contents":"..."}
   ```
   and nothing else.

The prompt is intentionally stable — the code detects this exact command
prefix, so any drift in the prompt that breaks the format also breaks
persistence.

Note: the LLM is not asked to produce a `district` field, but
`storeComplaint()` reads `$data['district']` for both the reference number
generator and `district_name`. If you want district-aware routing, extend the
prompt.

---

## 7. Data Model

### `chat_messages` (migration `2025_12_16_000000`)

| Column | Type | Purpose |
|---|---|---|
| `id` | bigint PK | |
| `channel` | string | `'whatsapp-meta'`, `'telegram'`, `'whatsapp-web'` |
| `chat_id` | string (indexed) | For WABA: user's phone number (`from`) |
| `role` | string | `'user'` \| `'assistant'` \| `'system'` |
| `content` | text | Message body |
| `created_at`, `updated_at` | timestamps | |

Retention: unbounded. Rows are only pruned on `/reset`, `/batal`, or after a
successful complaint submission. Idle conversations accumulate indefinitely.

### `complaints` (relevant columns for the WABA path)

The full schema is large — see the migration for the complete list. The
WABA-relevant columns are those `storeComplaint()` writes; everything else is
populated later in the internal (pegawai) workflow.

---

## 8. Configuration

### 8.1 Environment variables

| Env var | Purpose |
|---|---|
| `WHATSAPP_VERIFY_TOKEN` | Shared secret echoed to Meta during subscription |
| `WHATSAPP_ACCESS_TOKEN` | Meta app / system-user access token (long-lived recommended) |
| `WHATSAPP_PHONE_NUMBER_ID` | Numeric phone number ID from the App Dashboard |
| `OPENAI_API_KEY` | For the LLM call |
| `APP_URL` | Interpolated into the reply URL after a successful complaint |
| `QUEUE_CONNECTION` | Determines where `SendToLlmJob` runs (typically `database`) |

### 8.2 `config/services.php`

```php
'whatsapp' => [
    'verify_token'    => env('WHATSAPP_VERIFY_TOKEN'),
    'token'           => env('WHATSAPP_ACCESS_TOKEN'),
    'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
],
```

### 8.3 Queue

`SendToLlmJob` implements `ShouldQueue`. In production the workflow depends on
a running `php artisan queue:work` process. If the worker is not running, the
webhook still returns 200 but the user never gets a reply. Check the `jobs`
table (default `database` driver) for stalled entries.

---

## 9. End-to-End Sequence (typical complaint)

1. User sends `"Hi"` from WhatsApp to the linked business number.
2. Meta POSTs to `/api/whatsapp` (assuming the webhook is subscribed and the
   number is provisioned).
3. Controller lowercases + trims, extracts `from`, builds `hints`, dispatches
   `SendToLlmJob`, returns 200.
4. Queue worker picks up the job, calls `LlmComplaintService::handleIncoming`.
5. Service inserts a `user` `ChatMessage`, calls OpenAI with system prompt +
   optional hints + last 10 messages, gets back `"Salam sejahtera... 1. Info
   JAIS 2. Buat aduan..."`.
6. Service inserts an `assistant` `ChatMessage`. Reply is not
   `/store_complaint`, so it's returned as-is.
7. `SendToLlmJob::sendToWhatsApp` POSTs the reply to
   `graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages`. User sees the menu.
8. User replies `"2"`. Loop through steps 2–7 several times, once per prompt
   question (5 questions + confirmation).
9. On confirmation `"ya"`, the LLM emits `/store_complaint {"name":"...", ...}`.
10. `handleIncoming` detects the command, `storeComplaint` creates the row,
    wipes `chat_messages`, returns the confirmation text with reference number.
11. `sendToWhatsApp` delivers `"Aduan anda telah berjaya diterima. Ini nombor
    rujukan aduan : AJ-YYYY-NNNNNN..."`.

---

## 10. Known Gaps & Bugs

Documented so future engineers can decide whether to address them.

### 10.1 No HMAC signature verification (security)

Meta sends `X-Hub-Signature-256: sha256={hmac}` on every webhook POST. The
controller does not verify it, and there is no `WHATSAPP_APP_SECRET` in
`config/services.php` at all. Anyone who discovers the public webhook URL
can POST arbitrary payloads and have them treated as real user messages.

Compare with `GITHUB_WEBHOOK_SECRET` (already in `services.php`) which
is checked by the GitHub webhook path.

Fix sketch:

```php
$sig  = $request->header('X-Hub-Signature-256');
$body = $request->getContent();
$expected = 'sha256=' . hash_hmac('sha256', $body, config('services.whatsapp.app_secret'));
if (!hash_equals($expected, $sig ?? '')) {
    return response('Forbidden', 403);
}
```

### 10.2 Full payload logged at INFO

`WebhookController.php:39` — `\Log::info('WhatsApp Webhook Payload:', $payload);`.
Every inbound message (containing phone number, profile name, and message body)
is written to the Laravel log. If logs are shipped anywhere or backed up, that
is PII in an unexpected place.

### 10.3 `strtolower()` corrupts user data

Line 41 lowercases every inbound message before storing it. IC numbers still
work (digits), but names, addresses, and free-text complaint bodies lose case.
The stored `Complaint.complainant_name`, `address`, and `summary` are whatever
the LLM produced from lowercased input.

### 10.4 No message-ID deduplication

Meta retries webhook deliveries on non-200 or timeout. There is no dedup on
`messages[].id`, so retries produce duplicate LLM calls, duplicate
`ChatMessage` rows, and potentially duplicate complaints if the retry lands
after the LLM emits `/store_complaint`.

### 10.5 Dead code in `SendToLlmJob`

Methods `isStoreComplaintCommand()`, `handleStoreComplaint()`, and
`sendReply()` (lines 55–129) are never called — the equivalent logic runs
inside `LlmComplaintService::storeComplaint()`. `sendReply()` also has a bug:
it matches on `'whatsapp'` while WABA dispatches use `'whatsapp-meta'`, so
even if reached it would log "Unknown channel" instead of sending. Safe to
remove.

### 10.6 No queue retry policy

`SendToLlmJob` has no `$tries`, `$backoff`, or `failed()` handler. If OpenAI
times out (15s) the job errors and follows the queue's default retry policy;
if it fails permanently there's nothing to notify anyone.

### 10.7 Text-only both ways

- Inbound: `text.body` is the only path read. Images, audio, documents,
  location, and interactive replies are silently ignored (returns `ignored`).
- Outbound: no templates (required by Meta for outbound outside the 24h
  session window), no media, no buttons.

### 10.8 No status callback handling

Meta sends `statuses[]` (delivered/read/failed) on the same webhook. This
handler only looks at `messages[]`, so delivery telemetry is dropped.

---

## 11. Local Development / Testing Tips

### 11.1 Exposing the local webhook

Meta's App Dashboard requires HTTPS. Use ngrok (already configured in the
repo's `README.md`):

```
php artisan serve                                    # port 8000
ngrok http --url=<static-domain>.ngrok-free.app 8000 # public HTTPS
```

Then set the webhook URL in the Meta App Dashboard to
`https://<static-domain>.ngrok-free.app/api/whatsapp` and the verify token to
whatever `WHATSAPP_VERIFY_TOKEN` is in `api/.env`.

### 11.2 Simulating a message without WhatsApp

```
curl -X POST http://localhost:8000/api/whatsapp \
  -H 'Content-Type: application/json' \
  -d '{
    "entry":[{"changes":[{"value":{
      "messages":[{"from":"60123456789","id":"wamid.test","type":"text","text":{"body":"hi"}}],
      "contacts":[{"profile":{"name":"Test User"}}]
    }}]}]
  }'
```

You should see `{"status":"ok"}` immediately, and — with `queue:work` running —
a `SendToLlmJob` firing, `chat_messages` rows appearing, and an outbound POST
to `graph.facebook.com` (which will 401 if your token isn't valid, but the
inbound path will have executed).

### 11.3 Where to look when it's broken

- No verify handshake response: `WHATSAPP_VERIFY_TOKEN` mismatch — check env
  vs. Dashboard.
- Webhook returns 200 but no reply: is the queue worker running? Check the
  `jobs` and `failed_jobs` tables.
- Queue worker runs but no OpenAI reply: check `OPENAI_API_KEY` and the
  Laravel log for `"LLM error"`.
- OpenAI replies but WhatsApp doesn't: check `WHATSAPP_ACCESS_TOKEN`
  validity (short-lived tokens expire in 24h) and `WHATSAPP_PHONE_NUMBER_ID`.
- Complaint not persisted after confirmation: the LLM's `/store_complaint`
  JSON is malformed — check `chat_messages` for the assistant row, then
  `Log::warning('Store complaint JSON decode failed', ...)`.

---

## 12. Extension Points

If you're adding to the WABA path, these are the natural seams:

- **New commands** (like `/status`, `/help`): add early in
  `WebhookController::handleWebhook`, before the LLM dispatch.
- **Media receive**: add branches on `messages[0].type` before the text
  extraction; look at how `WhatsappWebController::handleMedia()` decodes
  base64 for a nearby precedent (though WABA uses a different flow — a
  two-step `GET /{media-id}` then download).
- **Template outbound** (needed to re-engage outside the 24h window): extend
  `sendToWhatsApp` to accept a `type` + template name/language/components
  payload.
- **Signature verification**: add a route middleware; see §10.1.
- **Status callbacks**: check for `entry[0].changes[0].value.statuses` before
  the `messages` branch and route them somewhere useful (delivery
  dashboard, retry logic, etc.).
