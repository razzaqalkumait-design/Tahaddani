import { SUB_TIERS, formatPrice } from '../catalog';

describe('formatPrice', () => {
  it('renders whole-dollar amounts without decimals', () => {
    expect(formatPrice(500, 'USD', 'en')).toBe('$5');
    expect(formatPrice(10000, 'USD', 'en')).toBe('$100');
  });

  it('keeps two decimals when the amount is not a whole dollar', () => {
    expect(formatPrice(1999, 'USD', 'en')).toBe('$19.99');
    expect(formatPrice(1, 'USD', 'en')).toBe('$0.01');
  });

  it('renders zero without throwing', () => {
    expect(formatPrice(0, 'USD', 'en')).toBe('$0');
  });
});

describe('SUB_TIERS pricing', () => {
  it('stores every price as a non-negative integer minor unit', () => {
    for (const tier of SUB_TIERS) {
      expect(Number.isInteger(tier.priceCents)).toBe(true);
      expect(tier.priceCents).toBeGreaterThanOrEqual(0);
    }
  });

  it('matches the price points carried over from the web catalog', () => {
    const byId = new Map(SUB_TIERS.map((tier) => [tier.id, tier.priceCents]));
    expect(byId.get('starter')).toBe(500);
    expect(byId.get('supporter')).toBe(1500);
    expect(byId.get('advocate')).toBe(5000);
    expect(byId.get('vip')).toBe(10000);
  });

  it('sums tiers exactly, with no floating-point drift', () => {
    const total = SUB_TIERS.reduce((sum, tier) => sum + tier.priceCents, 0);
    expect(total).toBe(17000);
    expect(formatPrice(total, 'USD', 'en')).toBe('$170');
  });

  it('assigns each tier a unique id', () => {
    const ids = SUB_TIERS.map((tier) => tier.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
