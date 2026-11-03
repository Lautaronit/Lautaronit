# On It — Ideas y hoja de ruta

> Documento vivo. Acá anotamos visión, decisiones y features a medida que
> aparecen, para no perder nada. No es código ni compromiso; es el pizarrón.

## Visión
Asistente de IA que hace pedidos a comercios en lenguaje natural, de la forma
más automática posible — desde un pedido inmediato ("2 Big Mac combo mediano")
hasta pedidos recurrentes ("todos los lunes, la compra del súper"). El objetivo
es que se sienta imprescindible: ahorra tiempo y automatiza procesos.

## Mercado objetivo
- **US / Europa** como lanzamiento principal.
- Motivos: mayor confianza y velocidad de adopción; y más probabilidad de que
  los comercios expongan un **MCP** para conectarnos que en Argentina/Sudamérica.

## Identidad visual (DEFINIDA)
- Minimalista, premium, cálida. La caja para escribir es la protagonista.
- Wordmark **"On It" en Fraunces cursiva**, verde oscuro (`#163A2B`).
- Fondo crema (`#F4F0E6`), texto negro cálido, **naranja (`#E8552D`) solo en la
  flecha de enviar**.
- Slogan en Space Grotesk: *"Pedí lo que quieras. Nosotros nos encargamos."*
- Pantalla de inicio: ☰ (menú) arriba, wordmark + slogan, caja grande con borde
  negro fino.

## Modelo de créditos
Dos caminos que coexisten (el usuario elige):
1. **Billetera / saldo:** carga plata en On It, ve su saldo, los pedidos se
   descuentan de ahí.
2. **Tarjeta directa:** agrega tarjeta de débito/crédito y se le cobra por pedido.

## Decisiones (resueltas / pendientes)
- [x] **Idioma**: **inglés** por el momento (mercado US/Europa). Español/multi-idioma más adelante.
- [x] **Moneda**: **USD**.
- [x] **Procesador de pagos**: **Stripe** (guarda tarjetas y cobra; estándar en US/Europa).
- [x] **Créditos**: billetera con saldo + tarjeta débito/crédito cobrada directo.
- [x] **Slogan (inglés)**: "Ask for anything. We're on it."
- [ ] **Modelo de negocio**: ¿markup/fee por pedido, abono mensual, o mix? (abierto)

## Monetización (candidatas)
Combinar varias, por fases:
- **Fee por pedido** (conveniencia): cargo chico fijo o % por pedido. Caja desde el día 1.
- **Comisión de comercios / afiliados**: plataformas/comercios pagan por traer pedidos.
- **On It+ (suscripción)**: abono mensual sin fees + perks. Ingreso recurrente (sube valuación).
- **Float del saldo**: interés sobre el dinero precargado en billeteras (a escala).
- **Sponsored**: comercios pagan por ser la opción sugerida (con cuidado de no romper confianza).
- **B2B / white-label**: On It como servicio para empresas u otras apps.

Orden recomendado: Fase 1 fee + afiliados → Fase 2 On It+ → Fase 3 float, sponsored, B2B.

## Lanzamiento y comercios reales (investigado)
No hay una API única para "pedir en cualquier comercio de EE.UU.", pero sí vías
concretas, y nuestra capa de conectores encaja perfecto (un conector por fuente):
- **Camino 1 (ya, sin permisos):** **Instacart Developer Platform** (gratis,
  claves auto-servicio, ~85k tiendas / ~1.800 cadenas; checkout se completa en
  Instacart por ahora). **Uber Direct** y **DoorDash Drive** (cuentas dev +
  sandbox) para la última milla (restaurantes, convenience, farmacias).
- **Camino 2 (partnership, para escalar):** **DoorDash Marketplace Retail** e
  **Instacart Connect** (catálogo + pedido completo, hay que aplicar y ser
  aprobado).
- **Camino 3 (atajo frágil):** APIs tipo Zinc que colocan la compra en
  Amazon/Walmart/Target. Para MVP, no como base.
- **Ojo:** Walmart/7-Eleven NO tienen API pública para que un tercero haga la
  compra de un cliente (las de Walmart son para vendedores).
- **Recomendación:** lanzar con **Instacart** (cubre el súper + los macros, es
  publicable sin acuerdos), sumar Uber Direct/DoorDash Drive, y aplicar a los
  partnerships en paralelo. Primero subir el backend a la nube (deploy) para
  poder abrir la app desde cualquier lado.

## Zona de configuración (menú ☰)
- Mis datos (nombre, email, teléfono)
- Direcciones (casa, trabajo…)
- Preferencias (comercios favoritos, "lo de siempre", restricciones)
- Medios de pago / tarjetas
- Créditos / saldo
- Pedidos programados

## Ideas de features (backlog de producto)
- [x] **Repetir pedidos** desde el historial (botón "Order again").
- [x] **Calendario** de pedidos programados, con sus horarios (franja semanal +
  alta/baja de recurrencias, con pausa/reanudar).
- [x] **Armador de canastas por macros**: "la compra del súper con este
  presupuesto y tantos g de proteína/carbos/grasa". Catálogo con datos
  nutricionales + optimizador voraz; propone la canasta, muestra macros
  logrados vs objetivo y total, y la pide de un toque. Endpoints
  `POST /baskets/plan` y `POST /orders/from-basket`. Pantalla "Macro basket"
  (en Settings). 62 tests. El día que enchufemos Instacart, usa productos reales.
- _(seguí sumando…)_

## Backlog técnico (backend)
- [x] Scheduler real de pedidos recurrentes (barre cada minuto; matcher de cron
  propio; botón "Run now" para disparar a mano).
- [x] **Agente con Claude** (`ClaudeAgent`): usa Claude (tool-use) para mapear el
  pedido en lenguaje natural a SKUs reales del catálogo, validando la respuesta.
  Misma interfaz que el de reglas. Se activa con `ANTHROPIC_API_KEY`; si no hay
  clave o la IA falla, cae automáticamente al de reglas. Modelo configurable con
  `AGENT_MODEL` (default `claude-opus-5-5`; se puede poner `claude-haiku-5-5`,
  mucho más barato y de sobra para esta tarea).
- [ ] Hardening pre-producción: idempotencia, exigir dirección válida.
- [~] **Primer conector real: Instacart (key-ready)**. `InstacartCartProvider`
  convierte una canasta en un link de compra de Instacart (IDP
  `POST /idp/v1/products/products_link`). Sin `INSTACART_API_KEY` queda inactivo
  (ruta `POST /baskets/instacart-link` → 503 con mensaje claro); con clave de
  desarrollo genera links reales. Botón "Order on Instacart" en la pantalla de
  macros. Falta: sacar la clave (dev), mapear SKUs→productos (nombre/UPC) y
  sumar base nutricional (USDA) para macros sobre productos reales. 68 tests.

## Estado actual (HECHO)
- Backend seguro (JWT + contraseñas hasheadas), con rate-limit y CORS. 22 tests.
- App Expo (celular + web) **en inglés + USD**: login, home + crear pedido,
  **Settings** (con cuenta vía `/me`) y **Credits** (billetera, visual).
- **Order history**: lista de pedidos con estado y "Order again" (repite el
  mensaje original por el mismo flujo). Endpoints `GET /orders`,
  `POST /orders/:id/reorder`.
- **Scheduled orders** (el "calendario"): franja semanal que se ilumina en los
  días con recurrencia activa, alta con formato simple (frecuencia + día + hora
  + presupuesto), pausar/reanudar y borrar. El alta valida el mensaje con el
  agente (solo se programa algo que sabemos ordenar) y resuelve el comercio.
  Endpoints `GET/POST /schedules`, `PATCH/DELETE /schedules/:id`.
- Endpoint `/me` para los datos de la cuenta.
- **Wallet (billetera real)** con Stripe **simulado**: saldo real, cargar fondos
  (cobro a tarjeta), tarjetas guardadas (alta/baja, solo tarjetas de prueba) y
  ledger de movimientos. **Los pedidos descuentan del saldo**; si no alcanza, el
  pedido se rechaza con un mensaje claro (cuánto falta). Todo detrás de una
  interfaz `PaymentProvider` (mismo patrón que los comercios/agente): el Stripe
  real se enchufa cambiando una sola clase, sin tocar el resto. Endpoints
  `GET /wallet`, `GET /wallet/transactions`, `POST /wallet/topup`,
  `GET/POST /payment-methods`, `DELETE /payment-methods/:id`.
- **Scheduler real**: al arrancar el server, un barrido cada minuto ejecuta las
  recurrencias que "tocan" (matcher de cron propio, sin dependencias). La lógica
  de "¿toca ahora?" (`isDue`) es pura y testeada. En la app, cada recurrencia
  tiene **Run now** (dispararla al instante) y muestra su última ejecución.
  Endpoint `POST /schedules/:id/run`. 43 tests.
- **Pantallas internas de Settings**: **Addresses** (alta/edit/predeterminada/
  borrar; al borrar la default, asciende otra), **Payment methods** (lista/alta/
  predeterminada/borrar, solo tarjetas de prueba) y **Preferences** (usual order,
  notas de dieta, aviso de pedidos). Endpoints `GET/POST/PATCH/DELETE /addresses`,
  `PATCH /payment-methods/:id/default`, `GET/PATCH /preferences`.

- **Atajo "Order the usual"** en la Home: si hay un "usual order" guardado,
  aparece un botón sobre la caja que hace el pedido de un toque (mismo flujo que
  escribirlo). Cierra el círculo con Preferences.

### Pendiente inmediato
- **Stripe real**: cuando haya cuenta, escribir `StripeProvider` (claves de test)
  + ingreso de tarjeta con Stripe Elements. Hoy el proveedor es simulado.
- Agente con Claude (hoy el "cerebro" es por reglas; necesita API key de Anthropic).
- Primer conector real (MCP / API de un partner).
