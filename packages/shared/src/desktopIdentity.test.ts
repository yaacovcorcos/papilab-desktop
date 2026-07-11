import { describe, expect, it } from "vitest";

import {
  LITREV_APP_NAME,
  LITREV_DESKTOP_ENTRY_URL,
  LITREV_DESKTOP_ORIGIN,
  LITREV_DESKTOP_UPDATE_CHANNEL,
  LITREV_DESKTOP_UPDATES_ENABLED,
  LITREV_DEVELOPMENT_BUNDLE_ID,
  LITREV_PRODUCTION_BUNDLE_ID,
  litrevBundleId,
} from "./desktopIdentity";

describe("desktopIdentity", () => {
  it("uses the exact LitRev product name and bundle IDs", () => {
    expect(LITREV_APP_NAME).toBe("LitRev");
    expect(LITREV_PRODUCTION_BUNDLE_ID).toBe("com.yaacovcorcos.litrev");
    expect(LITREV_DEVELOPMENT_BUNDLE_ID).toBe("com.yaacovcorcos.litrev.dev");
    expect(litrevBundleId(false)).toBe(LITREV_PRODUCTION_BUNDLE_ID);
    expect(litrevBundleId(true)).toBe(LITREV_DEVELOPMENT_BUNDLE_ID);
  });

  it("uses the exact packaged renderer origin and entry URL", () => {
    expect(LITREV_DESKTOP_ORIGIN).toBe("litrev://app");
    expect(LITREV_DESKTOP_ENTRY_URL).toBe("litrev://app/index.html");
  });

  it("keeps updates off until the LitRev-owned release channel is ready", () => {
    expect(LITREV_DESKTOP_UPDATE_CHANNEL).toBe("litrev");
    expect(LITREV_DESKTOP_UPDATES_ENABLED).toBe(false);
  });
});
