// FILE: desktopIdentity.ts
// Purpose: Defines LitRev's canonical desktop application identity across packaging and runtime.

export const LITREV_APP_NAME = "LitRev";
export const LITREV_DESKTOP_SCHEME = "litrev";
export const LITREV_DESKTOP_ORIGIN = `${LITREV_DESKTOP_SCHEME}://app`;
export const LITREV_DESKTOP_ENTRY_URL = `${LITREV_DESKTOP_ORIGIN}/index.html`;
export const LITREV_DESKTOP_UPDATE_CHANNEL = "litrev";
export const LITREV_DESKTOP_UPDATES_ENABLED = false;
export const LITREV_PRODUCTION_BUNDLE_ID = "com.yaacovcorcos.litrev";
export const LITREV_DEVELOPMENT_BUNDLE_ID = `${LITREV_PRODUCTION_BUNDLE_ID}.dev`;

export function litrevBundleId(isDevelopment: boolean): string {
  return isDevelopment ? LITREV_DEVELOPMENT_BUNDLE_ID : LITREV_PRODUCTION_BUNDLE_ID;
}
