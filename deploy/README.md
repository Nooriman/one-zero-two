# Deploying to AWS Lightsail

One small server runs everything: **Caddy** (HTTPS + the frontend) → **API** → **Postgres**, all in Docker.
Only ports 80 and 443 are open to the internet; Postgres and the API are never published.

Rough cost: Lightsail 1 GB plan ~$7/mo + snapshots ~$2/mo + a domain ~$1/mo ≈ **$10/mo**.
(Prices drift; check the Lightsail pricing page.)

## 1. Create the server

1. Lightsail → **Create instance** → Linux/Unix → OS only → **Ubuntu 24.04 LTS**.
2. Pick the **1 GB RAM** plan. The 512 MB plan is too small to build and run Node + Postgres.
3. Choose the region closest to you (e.g. Singapore).
4. **Networking → Create static IP** and attach it to the instance, so the address never changes.
5. **Networking → IPv4 Firewall** — keep only:
   - SSH `22` — restrict to *your* IP address if you can
   - HTTP `80` and HTTPS `443` — anywhere
   - optional: custom UDP `443` (HTTP/3)
6. At your domain registrar, add an **A record**: your domain → the static IP.
   Wait until it resolves (`ping yourdomain`) *before* starting the stack, or Caddy cannot get a certificate.

## 2. Prepare the server

SSH in (Lightsail's browser SSH works), then:

```bash
sudo apt-get update && sudo apt-get -y upgrade
sudo apt-get -y install docker.io docker-compose-v2 git unattended-upgrades
sudo usermod -aG docker $USER      # log out and back in afterwards

# 2 GB swap so the first build doesn't run out of memory on a 1 GB server
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 3. Get the code and configure it

```bash
git clone <your repo url> one-zero-two && cd one-zero-two/deploy
cp .env.example .env && chmod 600 .env
nano .env        # set DOMAIN, POSTGRES_PASSWORD (openssl rand -hex 24), backup settings
```

Create the backup passphrase file named in `.env` (`BACKUP_PASSPHRASE_FILE`):

```bash
openssl rand -base64 24 | sudo tee /root/backup-passphrase && sudo chmod 600 /root/backup-passphrase
sudo cat /root/backup-passphrase     # copy this into your password manager NOW
```

Without that passphrase the backups cannot be opened. Keep a copy that is **not** on this server.

## 4. Start it

```bash
docker compose up -d --build        # first build takes a few minutes
docker compose ps                   # db healthy, api and web up
curl https://yourdomain/api/health  # {"status":"ok","database":"connected"}
```

Create the two logins (interactive; it asks for a name and an 8-digit code):

```bash
docker compose exec api npx tsx scripts/set-code.ts
```

Open `https://yourdomain` on your phone and use "Add to Home Screen".
The first time anyone opens **Documents** they create the vault passphrase; the other login then unlocks with it.

## 5. Backups (do this before you store anything real)

Documents are end-to-end encrypted, but everything else (expenses, debts, liabilities) is a normal database, so back it up.

```bash
sudo mkdir -p /var/backups/one-zero-two
sudo ./backup.sh                    # run once by hand and check it works
sudo crontab -e                     # then add the line below
```

```
0 3 * * * /home/ubuntu/one-zero-two/deploy/backup.sh >> /var/log/one-zero-two-backup.log 2>&1
```

- Backups are gzip + AES-256 encrypted (`gpg`) and kept for 14 days in `BACKUP_DIR`.
- Also copy them off the server: set `BACKUP_S3_URI` (needs the `aws` CLI and an IAM user limited to that bucket), or turn on
  **Lightsail automatic snapshots** (Instance → Snapshots) as a second layer.
- **Test a restore once**, on purpose:

```bash
cd ~/one-zero-two/deploy
docker compose stop api
docker compose exec -T db psql -U onezerotwo -d onezerotwo -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
sudo gpg --batch --pinentry-mode loopback --passphrase-file /root/backup-passphrase -d /var/backups/one-zero-two/<file>.gpg \
  | gunzip | docker compose exec -T db psql -U onezerotwo -d onezerotwo
docker compose start api
```

## 6. Updating

```bash
cd ~/one-zero-two && git pull && cd deploy && docker compose up -d --build
```

The API runs `prisma db push` on every start. It applies additive schema changes, and **refuses** (the API will not start) if a change would delete data, so a bad update cannot silently wipe tables. Check `docker compose logs api` if it doesn't come up.

## Security notes

- Never publish port 5432 or 3000. This compose file doesn't; keep it that way.
- Use SSH keys only (Lightsail's default) and keep `unattended-upgrades` on.
- The vault passphrase is separate from the 8-digit login codes. Write it down somewhere safe; if both of you lose it, the documents are unrecoverable.
- `deploy/.env` holds the database password. It is git-ignored; never commit it.
- Still to do in the app (not part of this setup): shorter sessions (and optionally a passkey).
