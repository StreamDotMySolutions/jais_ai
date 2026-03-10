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
2. node server.js
3. scan QR code guna phone Linked Devices dalam app WhatsApp
4. guna phone lain mesej wasap 'hello'

GitHub Webhook Auto-Deploy
---
1. Set `GITHUB_WEBHOOK_SECRET` in `api/.env`
2. Set the same secret in GitHub repo > Settings > Webhooks
3. Payload URL: `https://yourdomain.com/api/github-webhook`
4. Content type: `application/json`
5. Events: Just the push event

Link download Laragon:
https://io.bikegremlin.com/35435/laragon-6-php-8-4-install/

