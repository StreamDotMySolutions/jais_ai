<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Deployment Dashboard</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, sans-serif; background: #f0f2f5; margin: 0; padding: 24px; color: #333; }
        .container { max-width: 960px; margin: 0 auto; }
        h1 { font-size: 22px; margin: 0 0 20px; padding-bottom: 12px; border-bottom: 3px solid #0d6efd; }
        .badge { display: inline-block; background: #e7f3ff; color: #0d6efd; padding: 2px 10px; border-radius: 12px; font-size: 12px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .full { grid-column: 1 / -1; }
        .card { background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.08); overflow: hidden; }
        .card button { width: 100%; padding: 16px; border: none; background: none; cursor: pointer; font: inherit; text-align: left; transition: background .15s; }
        .card button:hover:not(:disabled) { background: #f5f7fa; }
        .card button:disabled { opacity: .5; cursor: not-allowed; }
        .card .icon { font-size: 22px; }
        .card .label { font-weight: 600; margin-top: 4px; }
        .card .desc { font-size: 12px; color: #666; margin-top: 2px; }
        .btn-all { background: linear-gradient(135deg, #0d6efd, #0b5ed7); color: #fff; }
        .btn-all:hover:not(:disabled) { background: linear-gradient(135deg, #0b5ed7, #0948b3) !important; }
        .btn-all .label { color: #fff; }
        .btn-all .desc { color: rgba(255,255,255,.8); }
        .btn-danger { background: #fff0f0; border-left: 3px solid #dc3545; }
        #output { background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 8px; font-family: 'Cascadia Code','Fira Code','Consolas',monospace; font-size: 13px; line-height: 1.6; white-space: pre-wrap; word-break: break-all; min-height: 200px; max-height: 500px; overflow-y: auto; margin-top: 16px; }
        #output .ok { color: #4ec9b0; }
        #output .fail { color: #f44747; }
        #output .label-line { color: #569cd6; font-weight: 600; }
        .msg-box { text-align: center; padding: 40px 20px; background: #fff; border-radius: 8px; margin-top: 16px; }
        .msg-box h2 { margin: 0 0 8px; color: #dc3545; }
        .msg-box p { color: #666; margin: 0; }
        .msg-box a { color: #0d6efd; }
        .footer { margin-top: 12px; font-size: 12px; color: #999; text-align: center; }
    </style>
</head>
<body>
<div class="container">
    <h1>⚙️ Deployment Dashboard <span class="badge">role: system</span></h1>

    <div id="auth-check" class="msg-box">
        <h2>🔒 Sila Login Dahulu</h2>
        <p>Buka <a href="{{ url('/') }}" target="_blank">laman utama</a> dan login dengan akaun <strong>system</strong>.</p>
        <p style="margin-top:8px;font-size:13px">Selepas login, refresh halaman ini.</p>
    </div>

    <div id="dashboard" style="display:none">
        <div class="grid">
            <div class="card"><button onclick="run('backup-db')"><div class="icon">📦</div><div class="label">Backup Database</div><div class="desc">mysqldump &rarr; storage/app/backups/</div></button></div>
            <div class="card"><button onclick="run('backup-code')"><div class="icon">📦</div><div class="label">Backup Source Code</div><div class="desc">tar.gz &rarr; storage/app/backups/</div></button></div>
            <div class="card"><button onclick="run('git-pull')"><div class="icon">🔄</div><div class="label">Git Pull</div><div class="desc">git pull origin main</div></button></div>
            <div class="card"><button onclick="run('composer')"><div class="icon">📦</div><div class="label">Composer Install</div><div class="desc">composer install --no-dev</div></button></div>
            <div class="card"><button onclick="run('npm-build')"><div class="icon">🏗️</div><div class="label">NPM Build</div><div class="desc">npm run build</div></button></div>
            <div class="card"><button onclick="run('migrate')"><div class="icon">🗄️</div><div class="label">Migrate DB</div><div class="desc">php artisan migrate --force</div></button></div>
            <div class="card full"><button class="btn-all" onclick="run('all')" style="padding:20px"><div class="icon">🚀</div><div class="label" style="font-size:18px">Backup + Deploy All</div><div class="desc">Backup &rarr; Git Pull &rarr; Composer &rarr; Build &rarr; Migrate</div></button></div>
            <div class="card full"><button onclick="viewLogs()"><div class="icon">📄</div><div class="label">Lihat Log Laravel</div><div class="desc">Baca bahagian akhir api/storage/logs/laravel.log (200 baris)</div></button></div>
        </div>

        <div id="output">&gt; Tekan butang di atas untuk mulakan proses.</div>

        <p style="margin:8px 0 0;font-size:13px;color:#888">⚠ Jangan tutup halaman semasa proses berjalan. Mungkin mengambil masa 1-5 minit.</p>
    </div>

    <div class="footer">hotline.jais.gov.my &bull; {{ now()->format('d/m/Y H:i') }}</div>
</div>

<script>
const token = localStorage.getItem('token');
if (token) {
    document.getElementById('auth-check').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
}

function viewLogs() {
    const out = document.getElementById('output');
    out.textContent = '⏳ Mengambil log...';

    fetch('/api/system/deploy/logs?lines=200', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content,
            'Accept': 'text/plain',
        }
    }).then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
    }).then(text => {
        out.textContent = text || '(log kosong)';
    }).catch(e => {
        out.textContent = '⚠ Gagal ambil log: ' + e.message;
    });
}

function run(cmd) {
    const btns = document.querySelectorAll('#dashboard button');
    btns.forEach(b => b.disabled = true);

    const out = document.getElementById('output');
    out.textContent = '⏳ Menunggu respons daripada server...';

    fetch('/api/system/deploy/run/' + cmd, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content,
            'Accept': 'text/plain',
        }
    }).then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        out.textContent = '';
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        function read() {
            reader.read().then(({done, value}) => {
                if (done) { btns.forEach(b => b.disabled = false); return; }
                out.textContent += decoder.decode(value, {stream: true});
                out.scrollTop = out.scrollHeight;
                read();
            }).catch(e => {
                out.textContent += '\n⚠ Ralat baca stream: ' + e.message + '\n';
                btns.forEach(b => b.disabled = false);
            });
        }
        read();
    }).catch(e => {
        out.textContent += '\n⚠ Gagal sambung ke server. Sila cuba lagi.\n  ' + e.message + '\n';
        btns.forEach(b => b.disabled = false);
    });
}
</script>
</body>
</html>
