import {
  gramsToCentigrams,
  centigramsToGrams,
  calculateGoldWeight,
  isWithinTolerance,
  calculateDifference,
  isValidWeight,
  hasEnoughWeight,
  formatWeight,
  WEIGHING_TOLERANCE_CG,
} from '../src/utils/helpers';

describe('Helpers', () => {
  describe('gramsToCentigrams', () => {
    it('should convert grams to centigrams correctly', () => {
      expect(gramsToCentigrams(1)).toBe(100);
      expect(gramsToCentigrams(0.5)).toBe(50);
      expect(gramsToCentigrams(10.25)).toBe(1025);
      expect(gramsToCentigrams(0)).toBe(0);
    });
  });

  describe('centigramsToGrams', () => {
    it('should convert centigrams to grams correctly', () => {
      expect(centigramsToGrams(100)).toBe(1);
      expect(centigramsToGrams(50)).toBe(0.5);
      expect(centigramsToGrams(1025)).toBe(10.25);
      expect(centigramsToGrams(0)).toBe(0);
    });
  });

  describe('calculateGoldWeight', () => {
    it('should calculate gold weight correctly', () => {
      expect(calculateGoldWeight(500, 100)).toBe(400);
      expect(calculateGoldWeight(100, 100)).toBe(0);
      expect(calculateGoldWeight(1000, 250)).toBe(750);
    });

    it('should return negative when tray weight exceeds total', () => {
      expect(calculateGoldWeight(50, 100)).toBe(-50);
    });
  });

  describe('isWithinTolerance', () => {
    it('should return true when difference is within tolerance', () => {
      expect(isWithinTolerance(1000, 1000)).toBe(true);
      expect(isWithinTolerance(1000, 1050)).toBe(true);
      expect(isWithinTolerance(1000, 950)).toBe(true);
    });

    it('should return false when difference exceeds tolerance', () => {
      expect(isWithinTolerance(1000, 1051)).toBe(false);
      expect(isWithinTolerance(1000, 949)).toBe(false);
    });

    it('should use correct tolerance value', () => {
      expect(WEIGHING_TOLERANCE_CG).toBe(50);
    });
  });

  describe('calculateDifference', () => {
    it('should calculate difference correctly', () => {
      expect(calculateDifference(1000, 950)).toBe(50);
      expect(calculateDifference(950, 1000)).toBe(-50);
      expect(calculateDifference(1000, 1000)).toBe(0);
    });
  });

  describe('isValidWeight', () => {
    it('should return true for non-negative weights', () => {
      expect(isValidWeight(0)).toBe(true);
      expect(isValidWeight(100)).toBe(true);
      expect(isValidWeight(1000)).toBe(true);
    });

    it('should return false for negative weights', () => {
      expect(isValidWeight(-1)).toBe(false);
      expect(isValidWeight(-100)).toBe(false);
    });
  });

  describe('hasEnoughWeight', () => {
    it('should return true when there is enough weight', () => {
      expect(hasEnoughWeight(1000, 500)).toBe(true);
      expect(hasEnoughWeight(1000, 1000)).toBe(true);
      expect(hasEnoughWeight(1000, 0)).toBe(true);
    });

    it('should return false when there is not enough weight', () => {
      expect(hasEnoughWeight(500, 1000)).toBe(false);
      expect(hasEnoughWeight(0, 100)).toBe(false);
    });
  });

  describe('formatWeight', () => {
    it('should format weight correctly', () => {
      expect(formatWeight(1000)).toBe('10.00g');
      expect(formatWeight(50)).toBe('0.50g');
      expect(formatWeight(1025)).toBe('10.25g');
      expect(formatWeight(0)).toBe('0.00g');
    });
  });
});
