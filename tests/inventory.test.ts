import { describe, expect, it } from 'vitest';

function canReserve(currentInventory: number, requested: number) {
  return requested > 0 && currentInventory >= requested;
}

describe('inventory reservation rule', () => {
  it('allows valid reservations', () => {
    expect(canReserve(5, 3)).toBe(true);
  });

  it('prevents obvious overselling', () => {
    expect(canReserve(2, 3)).toBe(false);
  });

  it('rejects invalid quantities', () => {
    expect(canReserve(10, 0)).toBe(false);
  });
});
