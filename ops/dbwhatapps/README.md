# JAIS Server Administration — Docs

This folder documents sysadmin work on the remote Ubuntu host `10.20.20.44` (`dbwhatapps`).

## Role
Act as **Ubuntu system administrator** for `dbwhatapps`. Work is done over SSH from a Windows
machine — diagnostics, network/DNS, packages, services — not software development in this directory.

## Host
| Item | Value |
|------|-------|
| IP | `10.20.20.44` |
| Hostname | `dbwhatapps` |
| OS | Ubuntu, kernel `7.0.0-14-generic` x86_64 (OpenSSH 10.2p1) |
| Login user | `itjais` (uid 1000, in `sudo`) |
| Root | available (separate password) |
| SSH host key | `ssh-ed25519 SHA256:9wgcNkmNNP0Jz8oeZBMwgBLxt8Zl+Us4V8Bd14Cbzes` |

## Connecting from a Windows box
Built-in OpenSSH `ssh` can't take a password non-interactively (no `sshpass`). Use PuTTY `plink`
(`C:\Program Files\PuTTY\plink.exe`). Pin the host key with `-hostkey` + `-batch` (plink reads the
host-key prompt from the console, not stdin, so it otherwise hangs). One command per invocation:

```
plink -batch -ssh -hostkey 'SHA256:9wgcNkmNNP0Jz8oeZBMwgBLxt8Zl+Us4V8Bd14Cbzes' \
  -pw '<password>' itjais@10.20.20.44 "<command>"
```

- For sudo, pipe the password to a single command: `echo '<pw>' | sudo -S <cmd>`.
- Don't use a `sudo` wrapper for commands that need their own stdin (e.g. `tee`) — the password
  pipe collides with the data. Instead write to a temp file as `itjais`, then `sudo cp` it in place.

## Local workstation (this Windows box)
The machine these docs were authored on — used to administer `dbwhatapps` over SSH.

### AWS access (re-checked 2026-06-29)
- **AWS CLI installed:** `aws-cli/2.34.31` at `C:\Program Files\Amazon\AWSCLIV2\aws`.
- **Two profiles configured** in `~/.aws/config` + `~/.aws/credentials`, both long-lived keys, both
  `region = ap-southeast-5`, `output = json`:

  | Profile | Account | User (IAM ARN) | Notes |
  |---|---|---|---|
  | `default` | `759371407156` (RTM AI CLOUD) | `user/azrilnazlialias` | Sole account in Organization `o-ltrrslozan` (master). Hosts the JAIS / RCS / TTS / portal / icecast workloads — see UDPS AI EC2 below. |
  | `streamdotmy` | `576754064384` | `user/streamdotmy-cli` | Owns the **UDPS AI** EC2 (where `hotline.jais.gov.my` actually runs) and three S3 buckets. Added 2026-06-29. |

- Use a profile per-command (`--profile <name>`) or set `AWS_PROFILE=<name>` for the shell session.
- **Web Console** (`console.aws.amazon.com`) is interactive browser sign-in (password + MFA) — cannot be
  driven from this CLI/agent. User signs in there manually.
- Rotation: replace keys in `~/.aws/credentials`, or migrate to `aws configure sso` + `aws sso login`
  (IAM Identity Center — short-lived cached creds, preferred over long-lived keys). Verify with
  `aws sts get-caller-identity --profile <name>`.

## Change log

### 2026-06-29 — Fix DNS so the server can resolve/ping `google.com`
**Symptom:** `ping google.com` failed; `getent hosts google.com` returned nothing.

**Diagnosis:** Connectivity was fine (`ping 8.8.8.8` and gateway `10.20.20.1` both OK).
`systemd-resolved` was running but `ens7` had **no upstream DNS server**. Netplan had `8.8.8.8`
mistakenly set as a DNS *search domain* with an empty nameserver `addresses` list.

`/etc/netplan/00-installer-config.yaml` (before):
```yaml
nameservers:
  addresses: []
  search:
  - 8.8.8.8
```

**Fix:** Backed up the file to `.bak`, then set real resolver addresses and removed the bad search entry:
```yaml
nameservers:
  addresses:
  - 8.8.8.8
  - 1.1.1.1
```
Validated with `sudo netplan generate`, applied with `sudo netplan apply`. (IP / route / MAC unchanged,
so the SSH session survived.) Change is persistent across reboot.

**Backup:** `/etc/netplan/00-installer-config.yaml.bak` (on the server).

**Verification:**
- `resolvectl status` → `ens7` Current Scopes: DNS, DNS Servers: `8.8.8.8 1.1.1.1`
- `getent hosts google.com` → resolves
- `ping google.com` → 0% packet loss (~2.2 ms)

### 2026-06-29 — Install MySQL server
**Task:** Install MySQL server on the target.

**Done:** `apt-get update` then `DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server`.
Installed **mysql-server 8.4.10-0ubuntu0.26.04.1** (candidate was 8.4.8; updates pulled 8.4.10).

**State after install:**
- Service `mysql` is `active` and `enabled` (autostarts on boot).
- Listens on **localhost only**: `127.0.0.1:3306` (classic) and `127.0.0.1:33060` (X protocol) — not network-exposed.
- `root` uses **auth_socket** — `sudo mysql` works locally with no password; no MySQL root password set.

**Verification:** `systemctl is-active/is-enabled mysql` → active/enabled; `sudo mysql -e "SELECT VERSION(); SHOW DATABASES;"` returns 8.4.10 and the default schemas (`information_schema`, `mysql`, `performance_schema`, `sys`).

**Not yet done:** no app DB/users created; remote access not enabled (would require bind-address
change + firewall + a non-root user).

### 2026-06-29 — Harden MySQL (mysql_secure_installation equivalent)
**Task:** Run `mysql_secure_installation`.

**Note:** The interactive script can't be driven over this non-interactive SSH, so the same steps were
applied as idempotent SQL via `sudo mysql -e "source /tmp/harden.sql"` (a temp file is used because
`sudo -S` and a heredoc both contend for stdin). Per user's decisions: **kept root on `auth_socket`**
(no password) and **skipped the VALIDATE PASSWORD component**.

**Applied:** removed anonymous accounts; restricted `root` to localhost (`localhost`/`127.0.0.1`/`::1`);
dropped `test` database and its `mysql.db` grant rows; `FLUSH PRIVILEGES`. (MySQL 8.4's fresh install was
already mostly in this state — the statements ran as a no-op confirmation.)

**Verification:** `anon_users=0`, `remote_root=0`, `test_db=0`, `root_auth=auth_socket`.

### 2026-06-29 — Create app database and user (hotline)
**Task:** Create database `hotline_db_production`, create user `hotline_user`, grant it access.

**Done (via `sudo mysql`):**
- `CREATE DATABASE hotline_db_production` (charset `utf8mb4`, collation `utf8mb4_0900_ai_ci`).
- `CREATE USER 'hotline_user'@'localhost'` with a generated 128-bit password.
- `GRANT ALL PRIVILEGES ON hotline_db_production.* TO 'hotline_user'@'localhost'` + `FLUSH PRIVILEGES`.

Host is `localhost` because MySQL is bound to localhost only (no remote access). If the app connects
from another machine, the user must be recreated as `'hotline_user'@'<ip-or-subnet>'` and MySQL opened up.

**Verification:** `SHOW DATABASES` lists `hotline_db_production`; `SHOW GRANTS` shows ALL PRIVILEGES on it;
logging in as `hotline_user` and `USE hotline_db_production` succeeds (`login_ok`).

### 2026-06-29 — Reachability check: 172.16.100.129
Asked to SSH there with the same credentials. Host answers **ICMP ping** (from both this Windows box and
`dbwhatapps`) but **all common TCP ports are closed/filtered** (22, 2222, 22022, 23, 21, 80, 443, 3389,
445, 3306, 5432, 8080, 8443) and `ssh-keyscan` got no response. No login service reachable → can't access
it. Credentials are not the blocker; reachability is (service not running, non-standard port, or firewall).

### 2026-06-29 — Install nginx
Installed **nginx 1.28.3** via `apt-get install -y nginx`. Service `active` + `enabled`; listens on
`0.0.0.0:80` and `[::]:80`; `curl http://127.0.0.1/` → 200 (default page). `ufw` is **inactive**, so
port 80 is reachable from the network at `http://10.20.20.44/`. No site config changed yet (default).

### 2026-06-29 — PHP for nginx (PHP-FPM)
Installed **PHP 8.5.4** + FPM and modules: `php-fpm php-mysql php-cli php-curl php-mbstring php-xml
php-zip php-gd`. FPM service `php8.5-fpm` is `active` + `enabled`, socket `/run/php/php8.5-fpm.sock`.

Rewrote `/etc/nginx/sites-available/default` (backup: `default.bak`) to a clean PHP-enabled server block:
`root /var/www/html`, `index index.php ...`, and a `location ~ \.php$` that does
`include snippets/fastcgi-php.conf; fastcgi_pass unix:/run/php/php8.5-fpm.sock;`. `nginx -t` OK, reloaded.

**Verification:** a temp `phptest.php` returned `Content-Type: text/html` with body
`PHP_WORKS:8.5.4:mysqli_on` (PHP executed, `mysqli` loaded → can reach local MySQL). Test file removed.

### 2026-06-29 — Enable services by default + set docroot to phpinfo
- `systemctl enable --now nginx php8.5-fpm mysql` — all three confirmed `active` + `enabled` (autostart on boot).
- Created `/var/www/html/index.php` = `<?php phpinfo();` (owner `www-data`). `http://10.20.20.44/` now
  serves the phpinfo page (title `PHP 8.5.4 - phpinfo()`).

> ⚠️ `phpinfo()` is exposed at the docroot and reachable on the network (ufw inactive). Useful for
> verification but leaks server detail — remove/restrict before this is anything but a dev box.

### 2026-06-29 — Claude Code install attempt: BLOCKED (kernel/runtime incompatibility), then reverted
**Goal:** install the Claude Code CLI on the server for remote (SSH) use.

**Outcome: not possible on this host right now.** Claude Code 2.x ships as a single ~244 MB **Bun-compiled
native binary** (both `claude.ai/install.sh` and `npm i -g @anthropic-ai/claude-code` deliver the *same*
binary — npm's `bin/claude.exe` is it; identical BuildID `3fa91603…`). That binary **busy-spins forever**
on this server: `claude --version` never returns even at a 90 s timeout, pinning a core at 99% CPU.
`strace` showed a tight `futex(WAIT,100ms)→ETIMEDOUT` + `sched_yield` loop — the runtime's event loop
failing to block on this box's unusual **kernel `7.0.0`**.

Diagnosis evidence: a trivial `node -e` ran instantly (system **Node v22.22.1** works), so the kernel is
fine for JS generally — it's specifically the **Bun runtime** that's incompatible here. Ruled out:
`UV_USE_IO_URING=0` (no change), the **musl** build (won't load — no musl loader on this glibc system),
and older pure-JS versions (registry only carries 2.1.x, all native — no JS-only fallback).

**Possible future paths:** boot a mainstream kernel (7.0.0 is the blocker), or run Claude Code from a
normal-kernel machine and target this server over SSH.

**Cleanup (reverted to pre-attempt state):** `npm uninstall -g @anthropic-ai/claude-code`; removed
`~/.claude` + downloaded binaries; purged `nodejs npm unzip tmux` + `apt-get autoremove`; cleared
`/tmp/cc-*`, strace logs, and npm caches. Verified `claude/node/npm/unzip/tmux` all gone, ~244 MB
reclaimed, and **nginx / php8.5-fpm / mysql remain active + enabled** (untouched).

### 2026-06-29 — AWS reconnaissance + add second account profile `streamdotmy`
**Account `759371407156` (RTM AI CLOUD, profile `default`)** — surveyed:
- Sole member of Organization `o-ltrrslozan` (no sibling accounts).
- 10 running EC2 in `ap-southeast-5`: `portal-1/2` (`m7i.xlarge`), `portal-staging`, `portal-bastion`,
  `RCS Prod` (`m7i-flex.xlarge`), `RCS Staging`, `tts-1/2/staging` (3× `g6.4xlarge` GPU), `icecast-muzikfm`.

**Added profile `streamdotmy`** (account `576754064384`, IAM user `streamdotmy-cli`).
Verified with `aws sts get-caller-identity --profile streamdotmy`.
That account holds **3 S3 buckets** (`juniorinnovathon-streamdotmy-com`,
`streamdotmy-com-site-576754064384`, `streamdotmy-inbound-mail-576754064384`) and 1 running EC2
in `ap-southeast-5a`: **UDPS AI** (`i-0af393623701e022d`, `t3.medium`, public IP `43.217.244.48`).

### 2026-06-29 — Locate where `hotline.jais.gov.my` actually runs, and which DB it uses
**DNS** → `43.217.244.48` → **UDPS AI EC2** (in the `streamdotmy` account, *not* the RTM AI CLOUD master).

**Access route:** no `.pem` for the `udps` keypair was on this Windows box, so used **EC2 Instance
Connect** — `aws ec2-instance-connect send-ssh-public-key` pushes a temp ed25519 public key (60-second
window), then SSH as `ubuntu`. AWS CLI on Windows can't resolve bash `/tmp/...` paths, so the temp
keypair lives at `C:\Users\<user>\.ssh\ec2ic-udps-tmp` and the `--ssh-public-key` arg uses the
Windows-style path. Re-push the key whenever the 60-s window expires.

**Discovered on the box:**
- Ubuntu 24.04.3 LTS, kernel `6.14.0-1017-aws`, MySQL **8.0.46** (sudo mysql via `auth_socket`).
- 8 databases — system + `jais_ai_dev`, `jais_dev`, **`jais_live`**, `udps_dev`.
- Nginx site `/etc/nginx/sites-enabled/hotline.jais.gov.my.conf`: frontend `/var/www/jais_ai/frontend/build`,
  Laravel API at `/var/www/jais_ai/api`, `/storage` alias, TLS via Certbot.
- Laravel `api/.env`: `APP_ENV=production`, **DB `jais_live` as user `jais_user`** on `127.0.0.1:3306`.
- Git repo on disk: `github.com/StreamDotMySolutions/jais_ai` on `main` at `af2db4b` (2026-06-20) —
  **1 commit behind** the local clone's `main` (which is at `a0f7b0f`).

**Security flag (not yet fixed):** Security Group `launch-wizard-2` on UDPS AI is open to `0.0.0.0/0`
on ports **22, 80, 443, AND 3306** — MySQL exposed to the entire internet. Should be tightened to
a known CIDR or removed entirely (MySQL already listens on `127.0.0.1` only inside the box, so the
SG rule is dead weight *and* a risk).

### 2026-06-29 — Stand up a local replica of `hotline.jais.gov.my` on `dbwhatapps`
**Goal:** mirror what's running on UDPS AI onto this server so it can serve the same app off
`hotline_db_production`.

**1. Snapshot the live DB.** `mysqldump --single-transaction --routines --triggers --events
--hex-blob --default-character-set=utf8mb4 --column-statistics=0 jais_live | gzip -9` on UDPS AI →
gzipped dump locally (1.0 MB gzipped, 68 tables, ~13 MB raw). The dump file path is git-ignored.
Copied to `itjais@dbwhatapps:~/` via `pscp` (sha256 verified end-to-end). Restored
into `hotline_db_production` via `sudo mysql hotline_db_production -e 'source ~/jais_live_*.sql'`
(the JAIS-doc pattern that avoids `sudo`'s password pipe colliding with SQL stdin) — post-state:
**68 tables, 6.5 MB**, no errors. `hotline_user` already has ALL PRIVILEGES on the DB.

**2. GitHub SSH access for `itjais`.** Generated fresh `~/.ssh/id_ed25519` on the server
(fingerprint `SHA256:BpCwJQCbvHddhmNJjRR8uv+uv2w3bsZGim8J+/pAgB8`). Added the public half to GitHub
under the `StreamDotMySolutions` account. `ssh -T git@github.com` →
*"Hi StreamDotMySolutions! You've successfully authenticated…"*. `github.com` host keys pre-seeded
into `~/.ssh/known_hosts` to avoid first-clone prompts under `-batch`.

**3. Clone repo into `/var/www/hotline.jais.gov.my`.** `sudo mkdir` + `chown itjais:itjais`, then
`git clone git@github.com:StreamDotMySolutions/jais_ai.git` as `itjais`. ~30 MB, on `main` at
`a0f7b0f` — i.e. **1 commit ahead** of live UDPS AI production.

**4. Bootstrap Laravel API.** Installed `composer 2.9.5` + `php8.5-bcmath` (other Laravel-required
extensions already present). Configured `api/.env`: `APP_ENV=production`, `APP_DEBUG=false`,
`APP_URL=http://10.20.20.44`, DB → `hotline_db_production` as `hotline_user`. Ran
`composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev --ignore-platform-reqs`
— **the `--ignore-platform-reqs` is needed because PHP 8.5 violates lock-file constraints**
(`nette/schema` pinned to 8.1–8.3, `nette/utils` to 8.0–8.4); `--no-dev` cuts out `paratest` which
also pins ≤ 8.3. All 92 runtime packages install and load fine on 8.5 despite the conservative pins.
Generated `APP_KEY`. `chgrp -R www-data` + `chmod ug+rwX` on `storage/` and `bootstrap/cache/`.
`php artisan storage:link`. `php artisan migrate:status` confirms Laravel sees the restored DB.

**Caveat — pre-existing PSR-4 violation in the repo:** class `App\Http\Controllers\User\ComplaintController`
lives in `ComplainController.php` (filename missing the `t`). Composer skips autoloading it. Not
something this work introduced — it's in `main`.

### 2026-06-29 — Frontend build + nginx site for hotline on `dbwhatapps`
**Reinstalled `nodejs` + `npm`** (they had been purged after the failed Claude Code attempt earlier
today) → Node v22.22.1, npm 9.2.0. Configured `frontend/.env` with `REACT_APP_API_URL=`,
`REACT_APP_FRONTEND_URL=`, `REACT_APP_SERVER_URL=`, `REACT_APP_BACKEND_URL=` all pointing at
`http://10.20.20.44[/api]`. `npm install` → 1587 packages, 555 MB `node_modules`, 26 s. `npm run build`
→ `frontend/build/` 16 MB (ESLint warnings only, no errors).

**Nginx site** `/etc/nginx/sites-available/hotline.jais.gov.my.conf` (modeled after the UDPS AI live
config). Listens `80 default_server`,
`server_name _`. Roots at `frontend/build`, `try_files` SPA fallback to `index.html`. `/storage`
aliased to `api/storage/app/public/`. `/api` aliased to `api/public/` with nested
`location ~ \.php$` → **`fastcgi_pass unix:/run/php/php8.5-fpm.sock`** (the only meaningful difference
vs the AWS site — see next entry), `fastcgi_read_timeout 600`,
`SCRIPT_FILENAME $request_filename`, `SCRIPT_NAME /api$fastcgi_script_name`. `@laravelapi` rewrite:
`/api/(.*)?$ /api/index.php?$is_args$args last`. **Removed the default phpinfo symlink**
(`/etc/nginx/sites-enabled/default`) since both wanted `default_server` on :80. `nginx -t` passes;
reloaded.

**Verified end-to-end** at `http://10.20.20.44/`:
- `GET /` → HTTP 200 (1375-byte React `index.html`).
- `POST /api/login` → HTTP 422 (Laravel validation error — confirms request reaches the controller,
  not just nginx).

App login uses existing seeded users from `jais_live`. No TLS yet — internal HTTP only at
`10.20.20.44`.

### 2026-06-29 — PHP 8.3 install attempt to match AWS prod: BLOCKED, reverted
**Goal:** swap dbwhatapps from PHP 8.5 (which Laravel 10 doesn't officially support) to **PHP 8.3**
(what the AWS UDPS AI site uses), so the FPM socket path and Composer constraints align with prod.

**Outcome: not feasible cleanly today.** Ubuntu 26.04 ships only PHP 8.5 in its main repos. Added
`ppa:ondrej/php` (the standard backport PPA), but:
- No `resolute` (26.04) suite published yet → 404 on `Release`.
- No `plucky` (25.04) suite either → 404.
- Falling back to `noble` (24.04 LTS) gets `php8.3-fpm 8.3.31` listed, but the packages depend on
  pre-t64 libs: `libxml2 (>= 2.8.0)`, `libicu74`, `libzip4t64 (>= 1.7.0)`. **Ubuntu 26.04 did the
  64-bit time_t transition** — those packages no longer exist under those names (they're now
  `libxml2t64`, `libicu76`, `libzip5` or similar), so apt refuses with "none of the choices are
  installable". Forcing the install would drag conflicting old libs across the whole system.

**Cleanup (reverted):** removed `/etc/apt/sources.list.d/ondrej-ubuntu-php-resolute.sources`,
`apt-get update`. **No PHP 8.3 packages were ever actually installed**, so nothing to uninstall.
Verified PHP 8.5 still sole FPM (`/run/php/php8.5-fpm.sock` only), nginx + site still serve
(`GET /` → 200, `POST /api/login` → 422).

**Possible future paths to get PHP 8.3 here:**
- Wait for ondrej PPA to publish `resolute` packages built against 26.04's t64 libs.
- Run `php:8.3-fpm` in a Docker container, switch nginx `fastcgi_pass` to the container's socket
  (cleanest isolation; doesn't disturb system libs).
- Upgrade the app to **Laravel 12** (officially supports PHP 8.2–8.5) — drops the deprecation
  noise and lets Composer install without `--ignore-platform-reqs`.
