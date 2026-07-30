<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Symfony\Component\Process\Process;

class DeployController extends Controller
{
    public function index()
    {
        return view('system.deploy.index');
    }

    public function run(Request $request, $command)
    {
        $user = $request->user();
        if (!$user || !$user->hasRole('system')) {
            return response('Unauthorized', 403);
        }

        $this->setupStreaming();

        try {
            $commands = $this->resolveCommands($command);

            foreach ($commands as $label => $cmd) {
                echo "▶ {$label}\n";
                $this->flushOutput();

                $process = Process::fromShellCommandline($cmd, base_path());
                $process->setTimeout(null);
                $process->setIdleTimeout(null);

                $exitCode = $process->run(function ($type, $buffer) {
                    echo $buffer;
                    $this->flushOutput();
                });

                $status = $exitCode === 0 ? '✓ BERJAYA' : '⚠ GAGAL (exit code: ' . $exitCode . ')';
                echo "{$status}\n\n";
                $this->flushOutput();
            }

            echo "═══ SELESAI ═══\n";
        } catch (\Throwable $e) {
            echo "\n⚠ Ralat: " . $e->getMessage() . "\n";
        }

        $this->flushOutput();
        exit;
    }

    protected function setupStreaming()
    {
        @ini_set('output_buffering', 'off');
        @ini_set('zlib.output_compression', false);
        while (ob_get_level()) { @ob_end_clean(); }
        header('Content-Type: text/plain; charset=utf-8');
        header('X-Accel-Buffering: no');
    }

    protected function flushOutput()
    {
        if (ob_get_level()) { @ob_flush(); }
        flush();
    }

    protected function resolveCommands($command)
    {
        $backupDir = storage_path('app/backups');
        $db = config('database.connections.mysql');

        $backupDb = sprintf(
            'mkdir -p %s && mysqldump --no-tablespaces -u%s -p%s -h%s -P%s %s > %s/db_$(date +%%Y%%m%%d_%%H%%M%%S).sql 2>&1',
            escapeshellarg($backupDir),
            escapeshellarg($db['username']),
            escapeshellarg($db['password']),
            escapeshellarg($db['host']),
            escapeshellarg($db['port'] ?? '3306'),
            escapeshellarg($db['database']),
            escapeshellarg($backupDir)
        );

        $backupCode = sprintf(
            'mkdir -p %s && tar -czf %s/code_$(date +%%Y%%m%%d_%%H%%M%%S).tar.gz --exclude=api/storage/app/backups --exclude=api/node_modules --exclude=api/vendor --exclude=api/storage/debugbar --exclude=frontend/node_modules -C %s . 2>&1',
            escapeshellarg($backupDir),
            escapeshellarg($backupDir),
            escapeshellarg(dirname(base_path()))
        );

        $map = [
            'backup-db' => ['Backup Database' => $backupDb],
            'backup-code' => ['Backup Source Code' => $backupCode],
            'git-pull' => ['Git Pull' => 'git pull origin main 2>&1'],
            'composer' => ['Composer Install' => 'composer install --no-dev --no-interaction 2>&1'],
            'npm-build' => ['NPM Build' => 'cd ../frontend && npm run build 2>&1'],
            'migrate' => ['Artisan Migrate' => 'php artisan migrate --force 2>&1'],
            'all' => [
                'Backup Database' => $backupDb,
                'Backup Source Code' => $backupCode,
                'Git Pull' => 'git pull origin main 2>&1',
                'Composer Install' => 'composer install --no-dev --no-interaction 2>&1',
                'NPM Build' => 'cd ../frontend && npm run build 2>&1',
                'Artisan Migrate' => 'php artisan migrate --force 2>&1',
            ],
        ];

        if (!isset($map[$command])) {
            abort(404, "Command '{$command}' not defined.");
        }

        return $map[$command];
    }
}
