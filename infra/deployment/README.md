# Deploying UntoldMoney (free)

| Part | Where | Cost |
|---|---|---|
| Website (`apps/web`, Next.js) | Vercel Hobby | Free |
| API, Celery worker, scheduler, Postgres, Redis | One Oracle Cloud Always Free Arm server, via `docker-compose.prod.yml` | Free |
| Goonj campaigns database | Supabase (already live) | Free |

Vercel can't run the backend: Celery and the live price stream need a
process that never stops. Railway's and Render's free plans don't allow that
either. Railway's services sleep when idle, and Render has no free workers.

## 1. Create the server (one time, ~15 minutes)

1. Sign up at <https://signup.cloud.oracle.com>. A card is needed to verify
   you, but Always Free resources are never charged. Choose the home region
   closest to India, such as Mumbai or Hyderabad. You can't change it later.
2. Go to **Compute → Instances → Create instance**.
   - Image: **Ubuntu 24.04**.
   - Shape: **Ampere → VM.Standard.A1.Flex**, 2 OCPU, 12 GB.
   - Add SSH keys: **Save private key**, and keep the file safe, for example
     `~/.ssh/oracle.key`.
   - If it says "Out of capacity", try another availability domain or try
     again later.
3. Open the instance → **Subnet → Default security list → Add ingress
   rules**. Add source `0.0.0.0/0` with TCP destination ports `80` and `443`.
4. Copy the instance's **public IP**.

To keep it at ₹0, stay on the Free Tier account. Don't upgrade to Pay As
You Go: anything created beyond the free limits would then be billed. Only
pick options marked **Always Free-eligible**. On the free account, Oracle may
reclaim a server that is nearly idle for 7 days. If that happens, create a new
one and run `deploy.sh` again.

## 2. Prepare the server

```bash
chmod 600 ~/.ssh/oracle.key
scp -i ~/.ssh/oracle.key infra/deployment/server-setup.sh ubuntu@<IP>:
ssh -i ~/.ssh/oracle.key ubuntu@<IP> 'bash server-setup.sh'
```

## 3. Fill in production settings

```bash
cp .env.production.example .env.production
```

- `API_DOMAIN`: the IP with dashes plus `.sslip.io`, for example
  `129-146-12-34.sslip.io`, or your own domain pointed at the IP.
- `POSTGRES_PASSWORD`, `JWT_SECRET_KEY`: `openssl rand -hex 32`.
- `BROKER_TOKEN_KEY`: see the command in the file.
- `BROKER_EGRESS_IP`: the server IP.
- `FRONTEND_URL`, `API_PUBLIC_URL` and `BACKEND_CORS_ORIGINS`: the Vercel
  URL (`https://untold-money.vercel.app`).

`.env.production` is git-ignored. Never commit it.

## 4. Deploy the backend

```bash
SERVER=ubuntu@<IP> SSH_KEY=~/.ssh/oracle.key infra/deployment/deploy.sh
```

Check that it's up at `https://<API_DOMAIN>/health`. Run the same command
after every backend change.

Then update the broker redirect URLs in the Fyers and Angel One developer
apps to `https://untold-money.vercel.app/api/v1/brokers/<broker>/callback`.
They go through the website, because the site forwards `/api/v1/*` to the
API.

Useful commands on the server (`cd untoldmoney` first):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api
docker compose -f docker-compose.prod.yml --env-file .env.production restart worker
```

## 5. Deploy the website on Vercel

Root directory: `apps/web`. Add these environment variables for Production
and Preview:

| Variable | Value |
|---|---|
| `API_PROXY_TARGET` | `https://<API_DOMAIN>`. The site forwards `/api/v1/*` here. |
| `NEXT_PUBLIC_API_URL` | `/`, so the browser calls the site itself |
| `NEXT_PUBLIC_STREAM_URL` | `https://<API_DOMAIN>`. Live prices connect directly, because Vercel can't forward WebSockets. |
| `NEXT_PUBLIC_SUPABASE_URL` | from `apps/web/.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from `apps/web/.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | from `apps/web/.env.local` (secret) |
| `GOONJ_LEAD_SALT` | from `apps/web/.env.local` (secret) |
| `NEXT_PUBLIC_SITE_URL` | the Vercel URL |

These values are built into the site. After changing one, redeploy.

Why the site forwards API calls: the login refresh cookie is `SameSite=Lax`.
With the site on `vercel.app` and the API on another domain, browsers
wouldn't send that cookie, and every reload would sign people out. With
forwarding, the browser only ever talks to the site.
