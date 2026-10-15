# Deploying Dronacharya on your own server

Everything runs on the school's own server. **No outside services are used.**

| Piece | What it does | Runs as |
|---|---|---|
| **App** | Web app, API, room sockets, and the **media server** that carries class video and audio | `app` container (one Node process) |
| **Database** | Accounts, classes, attendance, notes, library | `db` container (Postgres 16) |
| **HTTPS proxy** | Serves the site over HTTPS (browsers only allow camera and microphone on HTTPS) | `proxy` container (Caddy) |
| **AI server** (optional) | Class notes, "ask about this class", caption translation (Ollama); live captions (Whisper) | `ollama` and `whisper` containers |

Sign-in is by **password**. An admin adds each person and gives them a temporary password, which
they replace the first time they sign in. Email codes are only offered if the school runs its own
mail server.

Allow about 30 minutes.

---

## 1. The server

- **Linux** with Docker Engine and the Compose plugin (`docker compose version` works).
- **Size:** 4 CPU cores and 8 GB RAM handles a few classes of ~30 at once. Video is forwarded, not
  re-encoded, so the CPU mostly goes to encryption. Network matters more than CPU: plan about
  **1.5 Mbit/s down per learner in each class**, plus that per viewer for the teacher's video.
- **The AI server** needs another 8–16 GB RAM (or a GPU) if you turn it on.
- **A public IP address** and a **domain name** pointing at it (an `A` record, e.g.
  `classroom.21k.school`).

### Firewall: open these ports

| Port | Protocol | What for |
|---|---|---|
| 80, 443 | TCP | The website (HTTPS; 80 only redirects) |
| 40000–40003 | **UDP** and TCP | Class video and audio. UDP is best; TCP is the fallback for strict networks. |

Keep everything else closed. The database and AI containers aren't reachable from outside.

## 2. Get the code and settings

```bash
git clone <your repository> dronacharya
```

```bash
cd dronacharya && cp .env.example .env
```

Fill in `.env`. These are the ones you must set:

| Setting | Value |
|---|---|
| `SITE_ADDRESS` | your domain, e.g. `classroom.21k.school` |
| `PUBLIC_APP_URL` | the same with `https://`, e.g. `https://classroom.21k.school` |
| `MEDIA_ANNOUNCED_IP` | the server's **public IP address** (browsers send video to it) |
| `POSTGRES_PASSWORD` | a long random value: `openssl rand -hex 24` |
| `SESSION_SECRET` | a long random value: `openssl rand -hex 32` |
| `BOOTSTRAP_ADMIN_EMAIL` | your email: the first admin |
| `BOOTSTRAP_ADMIN_NAME` | your name |

Leave `AUTH_DEV_LOGIN=0` and `SHOW_DEMO_FEATURES` empty (off in production).
The server refuses to start with an unsafe setting, such as a weak session secret or open test sign-in.

> **Server behind NAT** (e.g. a cloud VM with a private address): set `MEDIA_ANNOUNCED_IP` to the
> *public* IP and forward ports 40000–40003 UDP and TCP to the server.

## 3. HTTPS certificate

Pick one:

- **Your own certificate (nothing outside):** put `fullchain.pem` and `privkey.pem` in `deploy/certs/`.
  `deploy/Caddyfile` already uses them.
- **Automatic (Let's Encrypt):** delete the `tls /certs/...` line in `deploy/Caddyfile`. Caddy gets
  and renews a free certificate by itself. This is the only outside contact: it proves you own the
  domain, and no school data is sent.

## 4. Start it

```bash
docker compose up -d --build
```

The first build takes a few minutes (it compiles the media server). Then check:

```bash
docker compose ps
```

```bash
curl -s https://classroom.21k.school/api/health
```

The health check should answer `{"status":"ok","database":"ok","media":true,…}`. `media: false`
means the media server didn't start; `docker compose logs app` says why (usually a port already in use).

The server creates and upgrades its own tables on start. There's nothing to run by hand.

## 5. First sign-in

1. Find your first password:
   - If you set `BOOTSTRAP_ADMIN_PASSWORD`, it's that.
   - Otherwise the log prints a temporary one, once:

     ```bash
     docker compose logs app | grep "first admin"
     ```

2. Open the site and sign in with `BOOTSTRAP_ADMIN_EMAIL` and that password. You're asked to choose your own.
3. Go to **People → Add person** and add your teachers, counsellors, auditors, learners and parents.
   - Each new person gets a **temporary password**, shown once. Give it to them; they choose their own
     at first sign-in.
   - **Reset password** on People makes a new temporary one and signs them out everywhere.
   - Link each parent to their child.
4. Schedule classes from the class screen (**Schedule a class**) or through your CRM webhook.
   Learners on a class's list can join it. For any one learner, People has a **Copy link** button: a
   sign-in link straight into that class, valid 7 days, usable 10 times.

## 6. The AI server (optional)

Without it: notes are extractive (sentences taken from the transcript), questions are answered by
quoting the transcript, and live captions are off. Nothing ever goes to an outside AI service.

1. Start it:

   ```bash
   docker compose --profile ai up -d
   ```

2. Download a language model into it, once. This is the only download, and model files come from
   the Ollama library.

   ```bash
   docker compose exec ollama ollama pull qwen2.5:7b
   ```

3. In `.env`, set the following, then restart the app with `docker compose up -d app`:

   ```
   OLLAMA_URL=http://ollama:11434
   WHISPER_URL=http://whisper:8000
   ```

On a server with an NVIDIA GPU, uncomment the `deploy:` block under `ollama` in `docker-compose.yml`
and use a `-cuda` tag for `whisper`.

## 7. Optional extras

| Want | Do |
|---|---|
| **Sign-in codes by email, emails to parents** | Run your own mail server, then set `SMTP_URL` and `MAIL_FROM`. Otherwise nothing is emailed and parents see messages in their portal. |
| **A relay for very strict networks** | Learners behind a firewall that blocks UDP still connect over TCP on the media ports. For the direct-video fallback only, you can run [coturn](https://github.com/coturn/coturn) on this server and set `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL`. |
| **Files on separate storage** | Recordings and library files are kept in the `app-data` volume. To use your own S3-compatible store (e.g. MinIO), set the `RECORDING_S3_*` settings. |
| **A database elsewhere** | Remove the `db` service and set `DATABASE_URL` (plus `DATABASE_CA_CERT` for TLS). |
| **Staging copy with test accounts** | A second install with `AUTH_DEV_LOGIN=1` and `DEV_LOGIN_PASSCODE` (12+ random characters). Never on the real site. |

## 8. Check it works

Run the automated two-person class test from any machine with Chrome, against a **staging** copy
(it signs in with the test accounts):

```bash
DEV_LOGIN_PASSCODE=... node scripts/e2e-class.mjs https://staging.classroom.21k.school
```

Then try a real class: a teacher and a learner on different networks (e.g. office Wi-Fi and a phone hotspot).

## Backups and updates

- **Back up the database** every night (keep a few days of copies off the server):

  ```bash
  docker compose exec -T db pg_dump -U dronacharya dronacharya | gzip > backup-$(date +%F).sql.gz
  ```

- **Back up files** (recordings, library uploads): the `app-data` volume.
- **Update:** pull the new code, then run `docker compose up -d --build`. Tables upgrade themselves on start.
  Live classes drop for a few seconds and reconnect on their own, so update outside class hours.

## Settings reference

The full list, with defaults, is in `.env.example`. A few worth knowing:

| Setting | What it does |
|---|---|
| `MEDIA_WORKERS`, `MEDIA_PORT` | Media server processes, each on its own UDP + TCP port from `MEDIA_PORT`. If you change the count, change the port range in `docker-compose.yml` and on the firewall too. |
| `ROOM_FINISHED_GRACE_MS` | How long a class keeps running after everyone leaves the video room. Default 2 minutes, so a host refreshing doesn't end the class. |
| `CSP_ENFORCE` | `1` turns the Content-Security-Policy from report-only to enforced. |
| `RECORDING_CONSENT_DEFAULT` | Whether learners with no parent decision are included in recordings. |
| `MEDIA_DISABLED` | `1` turns the media server off. Classes fall back to direct peer-to-peer video and breakouts are unavailable. For testing only. |

## Without Docker

The app is one Node 22 process.

1. Run `npm ci`. It builds the media server's worker, which needs `python3`, `make` and a C++ compiler.
2. Run `npm run build`, then `npm start`.
3. Put any HTTPS reverse proxy in front of port 3000 (with WebSocket upgrades passed through), and
   point `DATABASE_URL` at Postgres.
