import { describe, expect, it } from 'vitest';
import { FULL_JOURNEY_ENTITLEMENT, hasEntitlement, selectRevenueCatKey } from '../src/game/purchases';

describe('child-safe purchase boundary', () => {
  it('selects only the platform public RevenueCat key', () => {
    const env = { VITE_REVENUECAT_IOS_API_KEY: ' appl_public ', VITE_REVENUECAT_ANDROID_API_KEY: ' goog_public ' };
    expect(selectRevenueCatKey('ios', env)).toBe('appl_public');
    expect(selectRevenueCatKey('android', env)).toBe('goog_public');
    expect(selectRevenueCatKey('web', env)).toBe('');
  });

  it('unlocks only when the configured lifetime entitlement is active', () => {
    expect(hasEntitlement({ entitlements: { active: { [FULL_JOURNEY_ENTITLEMENT]: { isActive: true } } } })).toBe(true);
    expect(hasEntitlement({ entitlements: { active: {} } })).toBe(false);
    expect(hasEntitlement(undefined)).toBe(false);
  });
});
