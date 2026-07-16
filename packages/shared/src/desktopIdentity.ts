// FILE: desktopIdentity.ts
// Purpose: Defines PapiLab's canonical desktop application identity across packaging and runtime.

export const PAPILAB_APP_NAME = "PapiLab";
export const PAPILAB_DESKTOP_SCHEME = "papilab";
export const PAPILAB_DESKTOP_ORIGIN = `${PAPILAB_DESKTOP_SCHEME}://app`;
export const PAPILAB_DESKTOP_ENTRY_URL = `${PAPILAB_DESKTOP_ORIGIN}/index.html`;
export const PAPILAB_DESKTOP_UPDATE_CHANNEL = "papilab";
export const PAPILAB_DESKTOP_UPDATES_ENABLED = false;
export const PAPILAB_PRODUCTION_BUNDLE_ID = "com.yaacovcorcos.papilab";
export const PAPILAB_DEVELOPMENT_BUNDLE_ID = `${PAPILAB_PRODUCTION_BUNDLE_ID}.dev`;

export function papilabBundleId(isDevelopment: boolean): string {
  return isDevelopment ? PAPILAB_DEVELOPMENT_BUNDLE_ID : PAPILAB_PRODUCTION_BUNDLE_ID;
}
