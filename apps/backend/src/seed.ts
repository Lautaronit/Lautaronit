/**
 * seed.ts
 * -----------------------------------------------------------------------------
 * Carga datos iniciales para poder probar On It end-to-end: un usuario demo y
 * una dirección de entrega predeterminada. Se corre con `npm run db:seed`.
 */

import { prisma, disconnectDb } from "./db.js";
import { hashPassword } from "./services/auth/password.js";

const DEMO_EMAIL = "demo@onit.app";
const DEMO_PASSWORD = "demo1234";

// Saldo inicial para que el demo pueda pedir sin tener que cargar primero.
const DEMO_START_BALANCE_CENTS = 5000; // $50.00

async function main(): Promise<void> {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash, name: "Demo User" },
    create: {
      email: DEMO_EMAIL,
      name: "Demo User",
      passwordHash,
      walletBalanceCents: DEMO_START_BALANCE_CENTS,
    },
  });

  const hasAddress = await prisma.address.findFirst({
    where: { userId: user.id },
  });
  if (!hasAddress) {
    await prisma.address.create({
      data: {
        userId: user.id,
        label: "Home",
        street: "350 5th Ave",
        city: "New York",
        isDefault: true,
      },
    });
  }

  // Una tarjeta de prueba guardada (Visa test ••4242), como medio predeterminado.
  const hasCard = await prisma.paymentMethod.findFirst({ where: { userId: user.id } });
  if (!hasCard) {
    await prisma.paymentMethod.create({
      data: {
        userId: user.id,
        brand: "Visa",
        last4: "4242",
        expMonth: 12,
        expYear: 2030,
        isDefault: true,
        providerRef: "pm_mock_seed4242",
      },
    });
  }

  // Si la billetera arranca en 0 (usuario preexistente), le damos el saldo demo
  // y dejamos el movimiento inicial en el historial.
  const hasTxn = await prisma.walletTransaction.findFirst({ where: { userId: user.id } });
  if (!hasTxn) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        walletBalanceCents:
          user.walletBalanceCents > 0 ? user.walletBalanceCents : DEMO_START_BALANCE_CENTS,
      },
      select: { walletBalanceCents: true },
    });
    await prisma.walletTransaction.create({
      data: {
        userId: user.id,
        type: "topup",
        amountCents: DEMO_START_BALANCE_CENTS,
        balanceAfterCents: updated.walletBalanceCents,
        description: "Welcome credit",
      },
    });
  }

  console.log(`✅ Seed ready. Demo user: ${user.email} (id: ${user.id})`);
  console.log(`   Test login -> email: ${DEMO_EMAIL} | password: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("❌ Falló el seed:", err);
    process.exitCode = 1;
  })
  .finally(disconnectDb);
