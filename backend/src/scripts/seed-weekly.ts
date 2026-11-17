// Script para resetear la base de datos y simular una semana de operaciones
import prisma from '../utils/database';

// Precios por gramo
const PRICE_NACIONAL_PER_GRAM = 400000; // $400,000 COP por gramo
const PRICE_ITALIANO_PER_GRAM = 500000; // $500,000 COP por gramo

// Convertir gramos a centigramos
const g = (grams: number) => Math.round(grams * 100);

// Métodos de pago aleatorios
const PAYMENT_METHODS = ['CASH', 'TRANSFER', 'CARD', 'CREDIT'] as const;

// Nombres de operadores
const OPERATORS = ['Carlos Ruiz', 'Maria Lopez', 'Ana Martinez', 'Pedro Gomez'];

// Cuentas bancarias para transferencias
const BANK_ACCOUNTS = [
  { name: 'Cuenta Principal', bankName: 'Bancolombia', accountNumber: '123-456789-00', accountType: 'CORRIENTE' },
  { name: 'Cuenta Ahorros', bankName: 'Davivienda', accountNumber: '987-654321-00', accountType: 'AHORROS' },
];

interface TrayData {
  code: string;
  name: string;
  goldType: 'NACIONAL' | 'ITALIANO';
  trayWeightCg: number;
  goldWeightCg: number;
  pieceCount: number;
}

// Generar 30 bandejas: 15 Nacional, 15 Italiano
function generateTrays(): TrayData[] {
  const trays: TrayData[] = [];

  // 15 bandejas Nacional
  for (let i = 1; i <= 15; i++) {
    const code = `N${String(i).padStart(3, '0')}`;
    trays.push({
      code,
      name: `Bandeja Nacional ${i}`,
      goldType: 'NACIONAL',
      trayWeightCg: g(200 + Math.random() * 300), // bandeja entre 200g y 500g
      goldWeightCg: g(500 + Math.random() * 1500), // oro entre 500g y 2000g
      pieceCount: Math.floor(10 + Math.random() * 40), // 10 a 50 piezas
    });
  }

  // 15 bandejas Italiano
  for (let i = 1; i <= 15; i++) {
    const code = `I${String(i).padStart(3, '0')}`;
    trays.push({
      code,
      name: `Bandeja Italiano ${i}`,
      goldType: 'ITALIANO',
      trayWeightCg: g(200 + Math.random() * 300),
      goldWeightCg: g(500 + Math.random() * 1500),
      pieceCount: Math.floor(10 + Math.random() * 40),
    });
  }

  return trays;
}

// Calcular precio basado en peso y tipo de oro
function calculatePrice(goldWeightCg: number, goldType: string): number {
  const grams = goldWeightCg / 100;
  const pricePerGram = goldType === 'NACIONAL' ? PRICE_NACIONAL_PER_GRAM : PRICE_ITALIANO_PER_GRAM;
  return Math.round(grams * pricePerGram);
}

// Generar un método de pago simple o dividido
function generatePayments(amount: number, bankAccountIds: string[]): { method: string; amount: number; bankAccountId?: string }[] {
  // 60% efectivo, 20% transferencia, 10% tarjeta, 10% crédito
  const rand = Math.random();
  if (rand < 0.6) {
    // Pago único en efectivo
    return [{ method: 'CASH', amount }];
  } else if (rand < 0.8) {
    // Transferencia a cuenta aleatoria
    const bankId = bankAccountIds[Math.floor(Math.random() * bankAccountIds.length)];
    return [{ method: 'TRANSFER', amount, bankAccountId: bankId }];
  } else if (rand < 0.9) {
    return [{ method: 'CARD', amount }];
  } else {
    return [{ method: 'CREDIT', amount }];
  }
}

async function main() {
  console.log('🔄 Reseteando base de datos...\n');

  // 1. Borrar todos los datos en orden (respectando foreign keys)
  console.log('🗑️  Borrando datos existentes...');
  await prisma.auditLog.deleteMany();
  await prisma.dailyReconciliation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.weighing.deleteMany();
  await prisma.tray.deleteMany();
  await prisma.bankAccount.deleteMany();
  console.log('✅ Base de datos limpia\n');

  // 2. Crear cuentas bancarias
  console.log('🏦 Creando cuentas bancarias...');
  const bankAccounts = [];
  for (const ba of BANK_ACCOUNTS) {
    const account = await prisma.bankAccount.create({ data: ba });
    bankAccounts.push(account);
    console.log(`  ✓ ${account.name} - ${account.bankName} ${account.accountNumber}`);
  }
  console.log('');

  // 3. Crear 30 bandejas
  console.log('📦 Creando 30 bandejas...');
  const trayData = generateTrays();
  const trays = [];
  for (const td of trayData) {
    const tray = await prisma.tray.create({ data: td });
    trays.push(tray);
    const goldGrams = (td.goldWeightCg / 100).toFixed(0);
    console.log(`  ✓ ${tray.code} (${td.goldType}) - ${goldGrams}g oro, ${td.pieceCount} piezas`);
  }
  console.log('');

  // 4. Simular una semana de operaciones (7 días anteriores, NO hoy)
  // Esto deja hoy limpio para que el usuario pueda probar el flujo interactivo
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 7); // 7 días atrás

  const bankAccountIds = bankAccounts.map(ba => ba.id);
  let totalWeeklySales = 0;
  let totalWeeklyGoldCg = 0;

  for (let day = 0; day < 7; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day);
    // Use ISO date string to avoid timezone issues
    const isoDate = currentDate.toISOString().split('T')[0];
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = dayNames[currentDate.getUTCDay()];
    const dateStr = isoDate;

    console.log(`📅 ${dayName} - ${dateStr}`);

    // Guardar el peso inicial de cada bandeja para el cierre
    const trayWeightsBeforeDay = new Map();
    for (const tray of trays) {
      trayWeightsBeforeDay.set(tray.id, tray.goldWeightCg);
    }

    // 4a. Pesaje de apertura para cada bandeja (08:00 AM UTC)
    const openingTime = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 8, 0, 0, 0));

    for (const tray of trays) {
      const trayWeightCg = tray.trayWeightCg;
      const goldWeightCg = tray.goldWeightCg;
      const totalWeightCg = trayWeightCg + goldWeightCg;

      // Obtener el último cierre de esta bandeja para comparar
      const lastClosing = await prisma.weighing.findFirst({
        where: { trayId: tray.id, type: 'CLOSING' },
        orderBy: { createdAt: 'desc' },
      });

      const previousGoldWeightCg = lastClosing ? lastClosing.goldWeightCg : goldWeightCg;
      const differenceCg = goldWeightCg - previousGoldWeightCg;
      const withinTolerance = Math.abs(differenceCg) <= 50; // 0.5g = 50cg

      await prisma.weighing.create({
        data: {
          trayId: tray.id,
          type: 'OPENING',
          totalWeightCg,
          trayWeightCg,
          goldWeightCg,
          pieceCount: tray.pieceCount,
          operator: OPERATORS[Math.floor(Math.random() * OPERATORS.length)],
          notes: `Apertura ${dayName}`,
          previousGoldWeightCg,
          differenceCg,
          withinTolerance,
          createdAt: openingTime,
        },
      });
    }
    console.log(`  📋 Apertura: ${trays.length} bandejas pesadas`);

    // 4b. Simular ventas durante el día (10-25 ventas por día)
    const numSales = 10 + Math.floor(Math.random() * 16);
    let daySalesTotal = 0;
    let dayGoldCg = 0;

    for (let s = 0; s < numSales; s++) {
      // Seleccionar una bandeja aleatoria con oro suficiente
      const traysWithGold = trays.filter(t => t.goldWeightCg > g(10)); // mínimo 10g para vender
      if (traysWithGold.length === 0) break;

      const tray = traysWithGold[Math.floor(Math.random() * traysWithGold.length)];

      // Vender entre 5g y 50g (pero no más de lo disponible)
      const maxSellCg = Math.min(tray.goldWeightCg, g(50));
      const sellCg = g(5 + Math.random() * ((maxSellCg / 100) - 5));

      const price = calculatePrice(sellCg, tray.goldType);
      const payments = generatePayments(price, bankAccountIds);

      // Hora aleatoria entre 9 AM y 6 PM UTC
      const saleHour = 9 + Math.floor(Math.random() * 10);
      const saleMinute = Math.floor(Math.random() * 60);
      const saleTime = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), saleHour, saleMinute, 0, 0));

      const sale = await prisma.sale.create({
        data: {
          trayId: tray.id,
          goldWeightCg: sellCg,
          goldType: tray.goldType,
          amount: price,
          operator: OPERATORS[Math.floor(Math.random() * OPERATORS.length)],
          notes: `Venta simulada ${dayName}`,
          createdAt: saleTime,
          payments: {
            create: payments.map(p => ({
              method: p.method,
              amount: p.amount,
              status: 'CONFIRMED',
              bankAccountId: p.bankAccountId || null,
            })),
          },
        },
        include: { payments: true },
      });

      // Descontar peso de la bandeja
      await prisma.tray.update({
        where: { id: tray.id },
        data: { goldWeightCg: tray.goldWeightCg - sellCg },
      });

      // Registrar movimiento de inventario
      await prisma.inventoryMovement.create({
        data: {
          trayId: tray.id,
          type: 'SALE',
          previousWeightCg: tray.goldWeightCg + sellCg,
          newWeightCg: tray.goldWeightCg - sellCg,
          differenceCg: -sellCg,
          reason: `Venta #${sale.id.slice(0, 8)}`,
          referenceId: sale.id,
          operator: sale.operator,
          createdAt: saleTime,
        },
      });

      // Log de auditoría
      await prisma.auditLog.create({
        data: {
          action: 'CREATE',
          entity: 'Sale',
          entityId: sale.id,
          details: JSON.stringify({ goldWeightCg: sellCg, amount: price, method: payments[0].method }),
          operator: sale.operator,
          createdAt: saleTime,
        },
      });

      daySalesTotal += price;
      dayGoldCg += sellCg;
    }

    console.log(`  💰 Ventas: ${numSales} ventas, $${daySalesTotal.toLocaleString('es-CO')} (${(dayGoldCg / 100).toFixed(1)}g oro)`);

    // 4c. Pesaje de cierre para cada bandeja (6:30 PM UTC)
    const closingTime = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 18, 30, 0, 0));

    let closingsWithinTolerance = 0;
    let closingsOutsideTolerance = 0;

    for (const tray of trays) {
      // Recargar la bandeja para obtener el peso actualizado después de ventas
      const currentTray = await prisma.tray.findUnique({ where: { id: tray.id } });
      if (!currentTray) continue;

      const goldWeightCg = currentTray.goldWeightCg;
      const trayWeightCg = currentTray.trayWeightCg;

      // Simular variación por humedad (±0.3g)
      const humidityVariation = Math.round((Math.random() - 0.5) * 60); // -30 a +30 cg
      const measuredGoldCg = goldWeightCg + humidityVariation;
      const totalWeightCg = trayWeightCg + measuredGoldCg;

      // Comparar con el último pesaje (apertura del día)
      const lastWeighing = await prisma.weighing.findFirst({
        where: { trayId: tray.id },
        orderBy: { createdAt: 'desc' },
      });

      const previousGoldWeightCg = lastWeighing ? lastWeighing.goldWeightCg : measuredGoldCg;
      const differenceCg = measuredGoldCg - previousGoldWeightCg;
      const withinTolerance = Math.abs(differenceCg) <= 50;

      if (withinTolerance) closingsWithinTolerance++;
      else closingsOutsideTolerance++;

      await prisma.weighing.create({
        data: {
          trayId: tray.id,
          type: 'CLOSING',
          totalWeightCg,
          trayWeightCg,
          goldWeightCg: measuredGoldCg,
          pieceCount: currentTray.pieceCount,
          operator: OPERATORS[Math.floor(Math.random() * OPERATORS.length)],
          notes: `Cierre ${dayName}${!withinTolerance ? ' - FUERA DE TOLERANCIA' : ''}`,
          previousGoldWeightCg,
          differenceCg,
          withinTolerance,
          createdAt: closingTime,
        },
      });
    }
    console.log(`  🔒 Cierre: ${closingsWithinTolerance} dentro tolerancia, ${closingsOutsideTolerance} fuera`);

    // 4d. Crear conciliación diaria
    const dayStart = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 23, 59, 59, 999));

    const dayPayments = await prisma.payment.findMany({
      where: {
        sale: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      },
    });

    const cashTotal = dayPayments.filter(p => p.method === 'CASH').reduce((sum, p) => sum + p.amount, 0);
    const transferTotal = dayPayments.filter(p => p.method === 'TRANSFER').reduce((sum, p) => sum + p.amount, 0);
    const cardTotal = dayPayments.filter(p => p.method === 'CARD').reduce((sum, p) => sum + p.amount, 0);
    const creditTotal = dayPayments.filter(p => p.method === 'CREDIT').reduce((sum, p) => sum + p.amount, 0);
    const totalSales = cashTotal + transferTotal + cardTotal + creditTotal;

    const reconDate = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate(), 0, 0, 0, 0));
    await prisma.dailyReconciliation.create({
      data: {
        date: reconDate,
        totalSales,
        cashTotal,
        transferTotal,
        cardTotal,
        creditTotal,
        status: 'CLOSED',
        closedBy: 'Sistema',
        closedAt: closingTime,
      },
    });

    totalWeeklySales += totalSales;
    totalWeeklyGoldCg += dayGoldCg;
    console.log('');
  }

  // Resumen final
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 RESUMEN SEMANAL');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📦 Bandejas creadas: ${trays.length} (15 Nacional + 15 Italiano)`);
  console.log(`🏦 Cuentas bancarias: ${bankAccounts.length}`);
  console.log(`💰 Ventas totales semana: $${totalWeeklySales.toLocaleString('es-CO')} COP`);
  console.log(`🥇 Oro vendido total: ${(totalWeeklyGoldCg / 100).toFixed(1)}g`);
  console.log(`📅 Días simulados: 7 (Lunes a Domingo)`);

  // Conteos finales
  const totalTrays = await prisma.tray.count();
  const totalWeighings = await prisma.weighing.count();
  const totalSales = await prisma.sale.count();
  const totalPayments = await prisma.payment.count();
  const totalMovements = await prisma.inventoryMovement.count();
  const totalReconciliations = await prisma.dailyReconciliation.count();
  const totalAuditLogs = await prisma.auditLog.count();

  console.log('\n📈 Registros en base de datos:');
  console.log(`  Bandejas: ${totalTrays}`);
  console.log(`  Pesajes: ${totalWeighings}`);
  console.log(`  Ventas: ${totalSales}`);
  console.log(`  Pagos: ${totalPayments}`);
  console.log(`  Movimientos de inventario: ${totalMovements}`);
  console.log(`  Conciliaciones diarias: ${totalReconciliations}`);
  console.log(`  Logs de auditoría: ${totalAuditLogs}`);
  console.log('\n✅ Seed completado exitosamente!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
