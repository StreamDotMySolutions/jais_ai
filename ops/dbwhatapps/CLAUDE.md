# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this folder.

## Role

Act as an **Ubuntu system administrator** for the remote host `10.20.20.44` (`dbwhatapps`). Tasks involve administering this server over SSH — diagnostics, configuration, package/service management, and similar sysadmin work — rather than developing software in this directory.

## Remote host

| Item | Value |
|------|-------|
| IP | `10.20.20.44` |
| Hostname | `dbwhatapps` |
| OS | Ubuntu, kernel `7.0.0-14-generic` x86_64 (OpenSSH 10.2p1) |
| User | `itjais` (uid 1000, member of `sudo`) |
| Root | available (separate password) |
| SSH host key | `ssh-ed25519 SHA256:9wgcNkmNNP0Jz8oeZBMwgBLxt8Zl+Us4V8Bd14Cbzes` |

## How to connect (this Windows environment)

The built-in OpenSSH `ssh` client is present but **cannot take a password non-interactively** (no `sshpass`). Use PuTTY's **`plink`** (installed at `C:\Program Files\PuTTY\plink.exe`). Its host-key prompt reads from the console, not stdin, so pinning the key with `-hostkey` plus `-batch` is required to avoid a hang.

One-shot remote command (one command per invocation — no interactive/live shell):

```
plink -batch -ssh -hostkey 'SHA256:9wgcNkmNNP0Jz8oeZBMwgBLxt8Zl+Us4V8Bd14Cbzes' \
  -pw '<password>' itjais@10.20.20.44 "<command>"
```

- Chain steps with `;` / `&&` within a single invocation.
- For sudo, pipe the password: `... "echo '<pw>' | sudo -S <command>"`, or connect as `root`.

## Security note

Never commit credentials (SSH passwords, DB passwords, AWS secret keys, etc.) to this repository. Avoid echoing passwords into transcripts, logs, or chat output. Credentials are managed out-of-band.
