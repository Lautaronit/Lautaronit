# Desplegar On It a la nube 🚀

Guía paso a paso para poner **On It** online: el **backend** (la API) en un host, y
la **app web** accesible desde cualquier lado (celular incluido) con un link.

> Todo lo de acá tiene **plan gratis para empezar**. Lo único tuyo son las cuentas
> (GitHub + el host); el código ya está **listo para deployar**.

---

## Lo que vamos a desplegar

1. **Backend** (Fastify + Prisma + PostgreSQL) → **Railway** (recomendado: corre el
   `Dockerfile` y te da una base PostgreSQL administrada, gratis para arrancar).
2. **App web** (Expo web export) → **Vercel** o **Netlify** (hosting estático gratis),
   apuntando al backend de arriba.

*(Alternativas al backend: Render, Fly.io. El `Dockerfile` sirve para cualquiera.)*

---

## Paso 0 — Cuentas (una vez)

- Crear cuenta en **[github.com](https://github.com)** (gratis).
- Crear cuenta en **[railway.app](https://railway.app)** (gratis, se entra con GitHub).
- (Para la web) cuenta en **[vercel.com](https://vercel.com)** (gratis, con GitHub).

---

## Paso 1 — Subir el proyecto a GitHub

Desde la carpeta del proyecto (`C:\Users\ASUS\Documents\On It`), en una terminal:

```bash
git init
git add .
git commit -m "On It — primera versión"
```

Después, en GitHub: **New repository** → nombre `on-it` → **Private** → Create. Copiá
los comandos que te muestra ("…or push an existing repository"), que son del estilo:

```bash
git remote add origin https://github.com/TU-USUARIO/on-it.git
git branch -M main
git push -u origin main
```

> El `.gitignore` ya evita subir secretos (`.env`), `node_modules` y la base local.

---

## Paso 2 — Pasar la base de datos a PostgreSQL

En `apps/backend/prisma/schema.prisma`, cambiá **una línea**:

```prisma
datasource db {
  provider = "postgresql"   // antes decía "sqlite"
  url      = env("DATABASE_URL")
}
```

Commiteá el cambio:

```bash
git add apps/backend/prisma/schema.prisma
git commit -m "DB: PostgreSQL para producción"
git push
```

> Para seguir probando **local con SQLite**, dejá el `provider` en `"sqlite"` mientras
> desarrollás y cambialo a `"postgresql"` solo para deployar (o usá PostgreSQL también
> en local con `docker compose up`, que ya está configurado).

---

## Paso 3 — Desplegar el backend en Railway

1. En Railway: **New Project** → **Deploy from GitHub repo** → elegí `on-it`.
2. Railway detecta el `Dockerfile` y empieza a buildear.
3. Agregá la base: **New** → **Database** → **PostgreSQL**. Railway crea la variable
   `DATABASE_URL` automáticamente.
4. En el servicio del backend → pestaña **Variables**, agregá:
   - `DATABASE_URL` → referenciá la de la base (Railway sugiere `${{Postgres.DATABASE_URL}}`).
   - `JWT_SECRET` → un texto largo y aleatorio (inventá uno largo).
   - `CORS_ORIGIN` → la URL de tu web cuando la tengas (Paso 4); por ahora dejalo vacío.
   - *(opcional)* `ANTHROPIC_API_KEY`, `AGENT_MODEL`, `INSTACART_API_KEY` si los activás.
5. En **Settings → Networking → Generate Domain** para obtener la URL pública, algo como
   `https://on-it-production.up.railway.app`.
6. Probala: abrí `https://TU-URL/health` → debería responder `{"status":"ok"}`.

> El `Dockerfile` corre `prisma db push` al arrancar, así que la base se crea sola.
> No hay usuario demo en producción: los usuarios se crean con el registro (ver Nota).

---

## Paso 4 — Desplegar la app web y apuntarla al backend

En tu compu, generá el build web de Expo:

```bash
cd apps/mobile
npx expo export --platform web
```

Eso crea la carpeta `apps/mobile/dist`. Subila a Vercel:

1. En Vercel: **Add New → Project** → importá el repo `on-it`.
2. **Root Directory**: `apps/mobile`. **Build Command**: `npx expo export --platform web`.
   **Output Directory**: `dist`.
3. En **Environment Variables** de Vercel, agregá:
   - `EXPO_PUBLIC_API_URL` → la URL del backend de Railway (ej. `https://on-it-production.up.railway.app`).
4. **Deploy**. Te da una URL tipo `https://on-it.vercel.app`.
5. Volvé a Railway y poné esa URL en `CORS_ORIGIN` del backend (para que la web pueda
   hablarle). Redeploy del backend.

---

## Paso 5 — Probar

- Abrí `https://on-it.vercel.app` desde la compu **o el celular**.
- Registrate (ver Nota), pedí algo, probá el wallet, la canasta por macros, etc.

¡Listo! On It está online y accesible desde cualquier lado. 🎉

---

## Notas

- **Usuarios**: en producción no hay cuenta demo. La app ya tiene **pantalla de registro**
  (login + "Sign up") conectada a `POST /auth/register`: cada quien se crea su cuenta y
  queda logueado automáticamente. Nada más que hacer acá.
- **Secretos**: nunca van al repo. Se cargan como *Variables* en Railway/Vercel.
- **Costo**: los planes gratis alcanzan para probar y mostrar. Con tráfico real, estos
  servicios pasan a pago (son baratos para empezar).
- **App en tiendas (iOS/Android)**: eso es otro camino (EAS Build + Apple/Google). Esta
  guía cubre web + backend, que es lo que te permite usarla y mostrarla ya.
