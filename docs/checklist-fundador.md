# On It — Checklist de fundador (cuentas, permisos, datos) 📋

> El mapa de **todo lo que tenés que crear y completar a tu nombre** para que On It
> sea una app profesional y una empresa real. Lo vamos a recorrer **mañana, de a un
> ítem por vez**: para cada uno te paso el link exacto, qué tocar, qué datos tener a
> mano, y reviso que quede bien antes de pasar al siguiente. **Nada de fallas.**
>
> **Importante — seguridad:** acá anotamos usuarios, emails y a nombre de quién quedó
> cada cuenta. **Contraseñas NUNCA** (ni me las pases a mí ni las escribas acá). Usá un
> gestor de contraseñas (ej. Bitwarden/1Password) para guardarlas.
>
> Referencias de costo/tiempo: 💲 cuesta plata · ⏱️ tarda · 🔑 es una decisión.

---

## ⚠️ FASE 0 — La decisión fundacional (antes de todo lo demás)

**¿Operás como persona o como empresa de EE.UU.?** Esto define todo lo que sigue.

**El dato clave:** **Stripe no opera en Argentina.** Para cobrarle a usuarios en EE.UU.
(que es tu mercado), el camino estándar para un fundador fuera de EE.UU. es **formar una
empresa en EE.UU. (una LLC)** mediante **Stripe Atlas**, que te deja incorporar incluso
sin ser residente ni tener número fiscal americano. Eso además te habilita cuenta
bancaria US, y las cuentas de **organización** en Apple/Google.

- 🔑 **Opción A — Empresa (US LLC vía Stripe Atlas):** el camino "profesional/empresa".
  Necesario para cobrar de verdad. 💲~US$500 una vez + agente registrado (~US$100+/año).
- 🔑 **Opción B — Empezar como individuo:** avanzás con cuentas individuales (Apple
  individual, etc.) para **probar y mostrar** la app, y dejás los pagos en modo simulado
  hasta constituir la LLC. Útil para no frenarte, pero no podés cobrar todavía.

**Recomendación honesta:** esta decisión tiene implicancias impositivas en **los dos
países**, así que conviene validarla con un **contador** con experiencia en founders que
incorporan en EE.UU. No es para decidir a las apuradas. (Mi sugerencia práctica: arrancá
por la **Opción B** para no frenar el desarrollo y la demo, y constituí la **LLC** cuando
estés por activar pagos reales.)

**Fuentes:** [Stripe Atlas (founders no-residentes)](https://docs.stripe.com/atlas/83b-elections-non-us-founders.md) · [Guía Atlas 2026](https://www.nonresidentfounder.com/vendors/stripe-atlas)

---

## FASE 1 — Identidad y presencia (la marca, a tu nombre)

| # | Qué | Dónde | Costo | Datos a tener |
|---|-----|-------|-------|----------------|
| 1 | **Dominio** (ej. `onitapp.com`) | [Namecheap](https://www.namecheap.com) o [Cloudflare](https://www.cloudflare.com/products/registrar/) | 💲~US$10–15/año | Nombre disponible, tarjeta |
| 2 | **Email profesional** (`founder@onitapp.com`) | [Google Workspace](https://workspace.google.com) | 💲~US$6/mes | El dominio del ítem 1 |
| 3 | **Reservar redes** (TikTok, Instagram, X, YouTube) | cada app | Gratis | El nombre "On It" / variantes |

> El email del ítem 2 va a ser **la cuenta madre** de casi todo lo demás. Creálo primero.

---

## FASE 2 — Técnico / deploy (lo que ya empezamos)

| # | Qué | Dónde | Costo | Nota |
|---|-----|-------|-------|------|
| 4 | **GitHub** (repo del código) | [github.com](https://github.com) | Gratis | Ya tenemos el código listo para subir |
| 5 | **Railway** (backend + Postgres) | [railway.app](https://railway.app) | Gratis para empezar | Ver `DEPLOY.md` |
| 6 | **Vercel** (app web) | [vercel.com](https://vercel.com) | Gratis para empezar | Ver `DEPLOY.md` |

---

## FASE 3 — Integraciones (comercios + IA)

| # | Qué | Dónde | Costo | Nota |
|---|-----|-------|-------|------|
| 7 | **Instacart Developer Platform** (clave de desarrollo) | [developers.instacart.com](https://developers.instacart.com) | Gratis | ⏱️ la clave de *producción* pasa por revisión ~30–40 días → pedirla temprano |
| 8 | **Anthropic** (API key del agente IA, opcional) | [console.anthropic.com](https://console.anthropic.com) | 💲 pago por uso (centavos) | Solo si querés el agente con IA real |

---

## FASE 4 — Pagos (depende de la Fase 0)

| # | Qué | Dónde | Costo | Nota |
|---|-----|-------|-------|------|
| 9 | **Stripe Atlas** (formar LLC + Stripe) | [stripe.com/atlas](https://stripe.com/atlas) | 💲~US$500 una vez | Incluye la LLC (Delaware), ayuda con el **EIN** (nº fiscal US) y cuenta bancaria. Puede pedir **teléfono US**. |
| 10 | **Cuenta bancaria US** (Mercury/Brex) | se integra con Atlas | Gratis/varía | Para recibir los pagos |

> Si todavía no constituís: los pagos quedan en **modo simulado** (ya está construido así)
> y no cobramos nada real hasta que la LLC + Stripe estén activos.

---

## FASE 5 — Publicar en las tiendas (iOS / Android)

| # | Qué | Dónde | Costo | Datos a tener |
|---|-----|-------|-------|----------------|
| 11 | **D-U-N-S Number** (solo si vas por *organización*) | [Dun & Bradstreet](https://www.dnb.com/duns-number/get-a-duns.html) | Gratis | Nombre legal **exacto** de la empresa. ⏱️ hasta 30 días → pedirlo temprano |
| 12 | **Apple Developer Program** | [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll/) | 💲US$99/año | Apple ID, identidad. *Individual* = sin D-U-N-S; *Organización* = con D-U-N-S |
| 13 | **Google Play Console** | [play.google.com/console](https://play.google.com/console/signup) | 💲US$25 (una vez) | Verificación de identidad: **ID + tarjeta a tu nombre**. Org = D-U-N-S |
| 14 | **EAS Build** (generar los instaladores) | [expo.dev](https://expo.dev) | Gratis para empezar | Lo configuramos nosotros cuando llegue el momento |

> **Individual vs Organización:** como persona sola, el camino simple es **Individual**
> (sin D-U-N-S). Si querés que las apps figuren a nombre de **la empresa** (más pro),
> es **Organización** y necesitás el D-U-N-S (ítem 11) **antes**.

**Fuentes:** [Apple — enroll](https://developer.apple.com/programs/enroll/) · [Google Play — requisitos 2026](https://testerbee.com/blog/google-play-developer-verification-2026)

---

## FASE 6 — Legal y cumplimiento (obligatorio para tiendas y Stripe)

| # | Qué | Dónde | Costo | Nota |
|---|-----|-------|-------|------|
| 15 | **Política de Privacidad + Términos** | [Termly](https://termly.io) / [iubenda](https://www.iubenda.com) o abogado | Gratis/💲 | Requisito de App Store, Google y Stripe |
| 16 | **Declaraciones de datos** (App Privacy / Data Safety) | en Apple/Google al publicar | — | Lo completamos juntos al subir la app |
| 17 | **Contador (Argentina + US)** | profesional | 💲 | Por obligaciones impositivas/cambiarias por la LLC e ingresos US |

---

## Datos que conviene tener a mano (para ir rápido mañana)

- Un **email** elegido para el proyecto (ideal, el profesional de la Fase 1).
- **Pasaporte o DNI** (para verificaciones de identidad).
- Una **tarjeta** (para Apple/Google/dominios).
- (Si vas por LLC) decidido con el **contador**, y pasaporte + dirección.
- Un **gestor de contraseñas** instalado para guardar cada usuario/clave.

---

## Orden recomendado (ruta sin fallas)

1. **Fase 0** (decidir individuo vs empresa — idealmente con contador).
2. **Fase 1** (dominio + email profesional + reservar redes).
3. **Fase 2** (GitHub + deploy) ← podemos hacerlo ya, es gratis y muestra la app online.
4. **Fase 5 → ítem 11** (si vas por organización, pedir el **D-U-N-S ya**, porque tarda).
5. **Fase 3** (Instacart dev key — pedirla temprano por la revisión).
6. **Fase 6** (legales) antes de publicar.
7. **Fase 4** (pagos) + **Fase 5** (tiendas) cuando esté todo lo anterior.

> **Cómo lo hacemos:** mañana arrancamos por el ítem 1 (o el que vos quieras) y te guío
> **campo por campo**. Vos completás en tu cuenta, me avisás, y reviso antes de seguir.
> Marcamos cada ítem como ✅ a medida que lo cerramos.
</content>
