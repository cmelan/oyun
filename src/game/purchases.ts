/* Native-only RevenueCat boundary. The browser demo stays completely playable;
   store builds use a single, child-safe, non-consumable "full journey" unlock. */
import { Capacitor } from '@capacitor/core';

export const FULL_JOURNEY_ENTITLEMENT = 'full_journey';

type PublicEnv = Record<string, string | boolean | undefined>;
type Platform = 'ios' | 'android' | 'web';

export function selectRevenueCatKey(platform: Platform, env: PublicEnv): string {
  if (platform === 'ios') return String(env.VITE_REVENUECAT_IOS_API_KEY || '').trim();
  if (platform === 'android') return String(env.VITE_REVENUECAT_ANDROID_API_KEY || '').trim();
  return '';
}

export function hasEntitlement(customerInfo: unknown, id = FULL_JOURNEY_ENTITLEMENT): boolean {
  const active = (customerInfo as any)?.entitlements?.active;
  return !!active && Object.prototype.hasOwnProperty.call(active, id);
}

let configured = false;
let available = false;
let fullJourney = false;

export function isFamilyPurchaseAvailable(): boolean { return available; }
export function hasFullJourney(): boolean {
  /* The hosted demo remains judgeable end-to-end. Store builds gate chapters
     after the complete Meadow slice behind one honest, lifetime purchase. */
  return !Capacitor.isNativePlatform() || fullJourney;
}

export async function initPurchases(env: PublicEnv = (import.meta as any).env || {}): Promise<void> {
  if (configured || !Capacitor.isNativePlatform()) return;
  configured = true;
  const platform = Capacitor.getPlatform() as Platform;
  const apiKey = selectRevenueCatKey(platform, env);
  if (!apiKey) return;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.configure({ apiKey });
    const { customerInfo } = await Purchases.getCustomerInfo();
    fullJourney = hasEntitlement(customerInfo);
    available = true;
  } catch {
    /* Store setup/network failures must never block the free Meadow chapter. */
    available = false;
  }
}

export async function presentFamilyPurchase(): Promise<boolean> {
  if (!available) return false;
  try {
    const [{ Purchases }, { RevenueCatUI, PaywallPresentationConfiguration }] = await Promise.all([
      import('@revenuecat/purchases-capacitor'),
      import('@revenuecat/purchases-capacitor-ui'),
    ]);
    await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: FULL_JOURNEY_ENTITLEMENT,
      displayCloseButton: true,
      presentationConfiguration: PaywallPresentationConfiguration.FULL_SCREEN,
      customVariables: { game_name: 'Çok Kalpli Koruyucu' },
    });
    const { customerInfo } = await Purchases.getCustomerInfo();
    fullJourney = hasEntitlement(customerInfo);
    return fullJourney;
  } catch {
    return false;
  }
}
