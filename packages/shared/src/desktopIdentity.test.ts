import { describe, expect, it } from "vitest";

import {
  PAPILAB_APP_NAME,
  PAPILAB_DESKTOP_ENTRY_URL,
  PAPILAB_DESKTOP_ORIGIN,
  PAPILAB_DESKTOP_UPDATE_CHANNEL,
  PAPILAB_DESKTOP_UPDATES_ENABLED,
  PAPILAB_DEVELOPMENT_BUNDLE_ID,
  PAPILAB_PRODUCTION_BUNDLE_ID,
  papilabBundleId,
} from "./desktopIdentity";

describe("desktopIdentity", () => {
  it("uses the exact PapiLab product name and bundle IDs", () => {
    expect(PAPILAB_APP_NAME).toBe("PapiLab");
    expect(PAPILAB_PRODUCTION_BUNDLE_ID).toBe("com.yaacovcorcos.papilab");
    expect(PAPILAB_DEVELOPMENT_BUNDLE_ID).toBe("com.yaacovcorcos.papilab.dev");
    expect(papilabBundleId(false)).toBe(PAPILAB_PRODUCTION_BUNDLE_ID);
    expect(papilabBundleId(true)).toBe(PAPILAB_DEVELOPMENT_BUNDLE_ID);
  });

  it("uses the exact packaged renderer origin and entry URL", () => {
    expect(PAPILAB_DESKTOP_ORIGIN).toBe("papilab://app");
    expect(PAPILAB_DESKTOP_ENTRY_URL).toBe("papilab://app/index.html");
  });

  it("keeps updates off until the PapiLab-owned release channel is ready", () => {
    expect(PAPILAB_DESKTOP_UPDATE_CHANNEL).toBe("papilab");
    expect(PAPILAB_DESKTOP_UPDATES_ENABLED).toBe(false);
  });
});
