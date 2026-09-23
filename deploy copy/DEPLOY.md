# Despliegue COPSSTEC en VPS Hostinger + Nginx

Arquitectura interna (nada de esto se abre al público):

| Servicio | Bind | Puerto |
|----------|------|--------|
| Nginx | 0.0.0.0 | 80 / 443 |
| Next.js | 127.0.0.1 | 3000 |
| FastAPI | 127.0.0.1 | **8081** (no usa 8000) |
| PostgreSQL | 127.0.0.1 | 5432 |

El navegador solo habla con Nginx. `/api` y `/media` van al backend `:8081`; el resto al frontend `:3000`.

Reemplaza en todos los archivos:

- `TU_DOMINIO.com` → tu dominio
- `/var/www/copsstec-system` → ruta real si cambias el directorio

## 1. DNS en Hostinger

En hPanel → Dominios → DNS:

| Tipo | Nombre | Apunta a |
|------|--------|----------|
| A | `@` | IP pública del VPS |
| A | `www` | IP pública del VPS |

Espera a que resuelva (`ping TU_DOMINIO.com`) antes del SSL.

## 2. Conectar al VPS

```bash
ssh root@IP_DEL_VPS
```

Ubuntu 22.04/24.04. Si entras como otro usuario con sudo, antepone `sudo` a los comandos de sistema.

## 3. Paquetes base

```bash
apt update && apt upgrade -y
apt install -y nginx postgresql postgresql-contrib python3 python3-venv python3-pip \
  git curl ufw unzip build-essential libpq-dev
```

Node 20 (Next 15 lo requiere):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v   # v20.x
```

## 4. Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

No abras 3000 ni 8081. Solo 22, 80 y 443.

## 5. Usuario y código

```bash
id -u copsstec &>/dev/null || useradd -m -s /bin/bash copsstec
mkdir -p /var/www/copsstec-system /var/www/certbot
chown -R copsstec:copsstec /var/www/copsstec-system
```

Clona el repo (o sube el código con `scp`/`rsync`):

```bash
sudo -u copsstec git clone https://github.com/TU_ORG/copsstec-system.git /var/www/copsstec-system
# Si ya tienes el código en tu máquina:
# rsync -av --exclude .venv --exclude node_modules --exclude frontend/.next \
#   ./ copsstec@IP_DEL_VPS:/var/www/copsstec-system/
```

## 6. PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE USER copsstec WITH PASSWORD 'CAMBIA_ESTA_CLAVE';
CREATE DATABASE copsstec OWNER copsstec;
GRANT ALL PRIVILEGES ON DATABASE copsstec TO copsstec;
SQL
```

Si ya tienes un dump de la BD local (el esquema viene de Laravel + scripts SQL):

```bash
sudo -u postgres pg_restore -d copsstec /ruta/dump.dump
# o
sudo -u postgres psql -d copsstec < /ruta/dump.sql
```

Si partes de una BD ya existente, aplica los scripts del repo:

```bash
cd /var/www/copsstec-system
for f in backend/database/*.sql; do
  sudo -u postgres psql -d copsstec -f "$f"
done
```

## 7. Backend (puerto 8081)

```bash
cd /var/www/copsstec-system
sudo -u copsstec python3 -m venv .venv
sudo -u copsstec /var/www/copsstec-system/.venv/bin/pip install -U pip
sudo -u copsstec /var/www/copsstec-system/.venv/bin/pip install -r backend/requirements.txt

cp deploy/env/backend.production.env.example backend/.env
nano backend/.env   # DATABASE_URL, SECRET_KEY, FRONTEND_ORIGIN
chown copsstec:copsstec backend/.env
chmod 600 backend/.env

sudo -u copsstec mkdir -p backend/storage/{notices,member-documents,members,membership,blogs,payments,votaciones,agreements,courses}
```

Prueba rápida (luego se detiene; systemd lo tomará):

```bash
cd /var/www/copsstec-system/backend
sudo -u copsstec ../.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8081
# en otra sesión:
curl http://127.0.0.1:8081/api/health
# {"status":"ok"}  → Ctrl+C
```

## 8. Frontend

```bash
cd /var/www/copsstec-system/frontend
cp ../deploy/env/frontend.production.env.example .env.local
nano .env.local   # NEXT_PUBLIC_API_URL y NEXT_PUBLIC_SITE_URL = https://TU_DOMINIO.com
chown copsstec:copsstec .env.local

sudo -u copsstec npm ci
sudo -u copsstec npm run build
```

Si cambias `NEXT_PUBLIC_*` después, vuelve a ejecutar `npm run build` y `systemctl restart copsstec-frontend`.

## 9. systemd

```bash
chmod +x /var/www/copsstec-system/deploy/scripts/start-frontend.sh
cp /var/www/copsstec-system/deploy/systemd/copsstec-backend.service /etc/systemd/system/
cp /var/www/copsstec-system/deploy/systemd/copsstec-frontend.service /etc/systemd/system/

systemctl daemon-reload
systemctl enable --now copsstec-backend copsstec-frontend
systemctl status copsstec-backend copsstec-frontend --no-pager
```

Comprueba que **no** escucha 8000:

```bash
ss -tlnp | grep -E '3000|8000|8081'
# Esperado: 127.0.0.1:8081 y 127.0.0.1:3000. Nada en :8000.
```

## 10. Nginx

```bash
cp /var/www/copsstec-system/deploy/nginx/copsstec.conf /etc/nginx/sites-available/copsstec
nano /etc/nginx/sites-available/copsstec   # cambia TU_DOMINIO.com
ln -sf /etc/nginx/sites-available/copsstec /etc/nginx/sites-enabled/copsstec
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

## 11. HTTPS (Let's Encrypt)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d TU_DOMINIO.com -d www.TU_DOMINIO.com
```

Certbot reescribe el server block con 443 y redirección HTTP→HTTPS. Tras el SSL, `FRONTEND_ORIGIN`, `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_SITE_URL` deben ser `https://TU_DOMINIO.com` (sin slash final). Si reconstruiste el frontend con HTTP, vuelve a `npm run build` y reinicia el frontend.

## 12. Verificación

```bash
curl -I https://TU_DOMINIO.com
curl https://TU_DOMINIO.com/api/health
# {"status":"ok"}
```

Abre en el navegador:

- `https://TU_DOMINIO.com`
- `https://TU_DOMINIO.com/login`

## Actualizar el código

```bash
cd /var/www/copsstec-system
sudo -u copsstec git pull
sudo -u copsstec /var/www/copsstec-system/.venv/bin/pip install -r backend/requirements.txt
cd frontend && sudo -u copsstec npm ci && sudo -u copsstec npm run build
systemctl restart copsstec-backend copsstec-frontend
```

`backend/storage/` no va en git: no lo borres en un redeploy.

## Logs

```bash
journalctl -u copsstec-backend -f
journalctl -u copsstec-frontend -f
tail -f /var/log/nginx/error.log
```

## Problemas frecuentes

| Síntoma | Causa habitual |
|---------|----------------|
| CORS en consola | `FRONTEND_ORIGIN` no coincide con la URL exacta (`www` vs apex, `http` vs `https`) |
| `/api` 502 | backend caído: `systemctl status copsstec-backend` |
| Login OK pero media rota | `NEXT_PUBLIC_API_URL` mal en el build; rebuild frontend |
| 413 al subir archivo | `client_max_body_size` no está en 10M |
| Emails no salen | SMTP vacío: el backend solo loguea en stdout |
| Puerto 8000 ocupado | este deploy no lo usa; busca otro servicio: `ss -tlnp \| grep 8000` |
