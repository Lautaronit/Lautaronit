# On It 🤖🛒

Asistente de IA que **hace pedidos a comercios de forma automática** a partir de
lenguaje natural — desde una compra inmediata ("quiero 2 Big Mac combo mediano")
hasta pedidos recurrentes ("todos los lunes a las 9, la compra del súper con este
presupuesto").

> Estado: **esqueleto / MVP en construcción**. Hoy funciona de punta a punta
> contra comercios **simulados (mock)**, porque los comercios reales todavía no
> exponen APIs públicas de pedidos. El diseño está pensado para enchufar
> comercios reales (API oficial o MCP) sin reescribir la app.

---

## Arquitectura

Monorepo con workspaces de npm:

```
On It/
├── apps/
│   └── backend/            # API + agente IA + (próximamente) agenda
│       ├── prisma/         # esquema de la base de datos
│       └── src/
│           ├── config/     # variables de entorno validadas
│           ├── services/
│           │   ├── ai/     # el agente que interpreta el lenguaje
│           │   └── orders/ # orquesta: interpretar -> comprar -> guardar
│           ├── routes.ts   # endpoints HTTP
│           ├── app.ts      # arma la app y conecta las piezas
│           └── index.ts    # arranque del servidor
└── packages/
    └── connectors/         # CAPA ENCHUFABLE de comercios
        └── src/
            ├── types.ts        # el contrato `MerchantConnector`
            ├── mock/           # comercios simulados (hamburguesería + súper)
            └── registry.ts     # directorio de comercios disponibles
```

**La idea clave:** el backend solo habla con la interfaz `MerchantConnector`.
Agregar un comercio real = escribir una clase que cumpla ese contrato y
registrarla. Nada más del sistema cambia.

---

## Modelo de datos (decisiones de diseño)

El esquema vive en [`apps/backend/prisma/schema.prisma`](apps/backend/prisma/schema.prisma).

Entidades y relaciones:

- **User** `1—N` **Address** — un usuario, varias direcciones (casa, trabajo).
- **User** `1—N` **Order** — historial de pedidos.
- **Order** `1—N` **OrderItem** — las líneas de cada pedido.
- **Order** `N—1` **Address** — a dónde se entregó (opcional).
- **User** `1—N` **ScheduledOrder** — las recurrencias ("los lunes...").
- **ScheduledOrder** `1—N` **Order** — cada ejecución genera un pedido.

Decisiones:

1. **Dinero en centavos (`Int`), nunca decimales.** Evita errores de redondeo
   de punto flotante. `785000` = $7.850,00.
2. **`OrderItem` guarda `name` y `unitPriceCents` como "foto" del momento.** Si
   el comercio cambia el precio mañana, el pedido histórico no se altera.
3. **`Address` separada del `Order`.** No repetimos la dirección en cada compra;
   se referencia. `onDelete: SetNull` para no perder pedidos si se borra una
   dirección.
4. **`onDelete: Cascade`** en lo que pertenece al usuario (direcciones, pedidos,
   ítems): si se borra el usuario, se limpia todo lo suyo.
5. **Índices pensados para las consultas reales**, no "por las dudas":
   - `Order(userId, createdAt)` → "mis pedidos, más nuevos primero".
   - `Order(status)` → reintentos/paneles por estado.
   - `Order(merchantId)`, `OrderItem(sku)` → métricas y análisis.
   - `ScheduledOrder(active)` → el scheduler barre solo las activas.

### Generar los scripts SQL de creación

Prisma genera el SQL por vos. Para desarrollo rápido:

```bash
npm run prisma:push --workspace @on-it/backend   # crea las tablas en SQLite
```

Para producción con migraciones versionadas (genera el SQL en
`prisma/migrations/`):

```bash
npx prisma migrate dev --name init --workspace @on-it/backend
```

Pasar a **PostgreSQL**: en `schema.prisma` cambiá `provider = "postgresql"` y
poné una `DATABASE_URL` de Postgres en el `.env`. El modelo no cambia.

---

## Cómo correrlo

Requisitos: **Node.js 20+**.

```bash
# 1. Instalar dependencias (desde la raíz del proyecto)
npm install

# 2. Configurar el entorno del backend
#    Copiá .env.example a apps/backend/.env (la ANTHROPIC_API_KEY puede ir vacía)

# 3. Crear la base de datos y el cliente de Prisma
npm run prisma:generate --workspace @on-it/backend
npm run prisma:push --workspace @on-it/backend

# 4. Cargar datos de prueba (usuario + dirección demo)
npm run db:seed --workspace @on-it/backend

# 5. Levantar el backend
npm run dev
```

### Probar un pedido

Los pedidos requieren autenticación. Primero logueate con el usuario demo
(credenciales que crea el seed):

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "demo@onit.app", "password": "demo1234" }'
```

Copiá el `token` de la respuesta y usalo en el header `Authorization`:

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TU_TOKEN>" \
  -d '{ "message": "quiero 2 big mac combo mediano" }'
```

Endpoints:
- **Públicos:** `POST /auth/register`, `POST /auth/login`, `GET /health`,
  `GET /merchants`, `GET /merchants/:id/catalog`.
- **Requieren token:** `POST /orders`, `GET /orders`.

---

## Próximos pasos

- [ ] **Scheduler** de pedidos recurrentes (los `ScheduledOrder`).
- [ ] **Agente con Claude** (reemplaza/complementa el modo reglas actual).
- [ ] **App Expo** (celular + web) con la pantalla de chat.
- [x] **Autenticación** de usuarios (JWT + contraseñas hasheadas con scrypt).
- [ ] **Primer conector real** (API de partner o MCP de un comercio).
