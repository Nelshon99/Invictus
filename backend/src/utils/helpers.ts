import Decimal from 'decimal.js';

// Margen de error en centigramos (0.5g = 50cg)
export const WEIGHING_TOLERANCE_CG = parseInt(process.env.WEIGHING_TOLERANCE_CG || '50');

// Convertir gramos a centigramos
export function gramsToCentigrams(grams: number): number {
  const decimal = new Decimal(grams);
  return decimal.times(100).toNumber();
}

// Convertir centigramos a gramos
export function centigramsToGrams(centigrams: number): number {
  const decimal = new Decimal(centigrams);
  return decimal.dividedBy(100).toNumber();
}

// Calcular peso neto del oro (total - bandeja)
export function calculateGoldWeight(totalWeightCg: number, trayWeightCg: number): number {
  return totalWeightCg - trayWeightCg;
}

// Verificar si la diferencia está dentro del margen de error
export function isWithinTolerance(actualCg: number, expectedCg: number): boolean {
  const difference = Math.abs(actualCg - expectedCg);
  return difference <= WEIGHING_TOLERANCE_CG;
}

// Calcular la diferencia en centigramos
export function calculateDifference(actualCg: number, expectedCg: number): number {
  return actualCg - expectedCg;
}

// Validar que el peso no sea negativo
export function isValidWeight(weightCg: number): boolean {
  return weightCg >= 0;
}

// Validar que hay suficiente peso para una venta
export function hasEnoughWeight(currentGoldWeightCg: number, saleWeightCg: number): boolean {
  return currentGoldWeightCg >= saleWeightCg;
}

// Formatear peso para display
export function formatWeight(centigrams: number): string {
  const grams = centigramsToGrams(centigrams);
  return `${grams.toFixed(2)}g`;
}
