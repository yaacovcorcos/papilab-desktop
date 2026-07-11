export const BRAND_ASSET_PATHS = {
  productionMacIconPng: "assets/prod/litrev-macos-1024.png",
  productionMacLegacyIconPng: "assets/prod/litrev-macos-legacy-1024.png",
  productionLinuxIconPng: "assets/prod/litrev-universal-1024.png",
  productionWindowsIconIco: "assets/prod/litrev-windows.ico",
  productionWebFaviconIco: "assets/prod/litrev-web-favicon.ico",
  productionWebFavicon16Png: "assets/prod/litrev-web-favicon-16x16.png",
  productionWebFavicon32Png: "assets/prod/litrev-web-favicon-32x32.png",
  productionWebAppleTouchIconPng: "assets/prod/litrev-web-apple-touch-180.png",
  developmentWindowsIconIco: "assets/prod/litrev-windows.ico",
  developmentWebFaviconIco: "assets/prod/litrev-web-favicon.ico",
  developmentWebFavicon16Png: "assets/prod/litrev-web-favicon-16x16.png",
  developmentWebFavicon32Png: "assets/prod/litrev-web-favicon-32x32.png",
  developmentWebAppleTouchIconPng: "assets/prod/litrev-web-apple-touch-180.png",
} as const;

export interface IconOverride {
  readonly sourceRelativePath: string;
  readonly targetRelativePath: string;
}

export const DEVELOPMENT_ICON_OVERRIDES: ReadonlyArray<IconOverride> = [
  {
    sourceRelativePath: BRAND_ASSET_PATHS.developmentWebFaviconIco,
    targetRelativePath: "dist/client/favicon.ico",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.developmentWebFavicon16Png,
    targetRelativePath: "dist/client/favicon-16x16.png",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.developmentWebFavicon32Png,
    targetRelativePath: "dist/client/favicon-32x32.png",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.developmentWebAppleTouchIconPng,
    targetRelativePath: "dist/client/apple-touch-icon.png",
  },
];

export const PUBLISH_ICON_OVERRIDES: ReadonlyArray<IconOverride> = [
  {
    sourceRelativePath: BRAND_ASSET_PATHS.productionWebFaviconIco,
    targetRelativePath: "dist/client/favicon.ico",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.productionWebFavicon16Png,
    targetRelativePath: "dist/client/favicon-16x16.png",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.productionWebFavicon32Png,
    targetRelativePath: "dist/client/favicon-32x32.png",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.productionWebAppleTouchIconPng,
    targetRelativePath: "dist/client/apple-touch-icon.png",
  },
];
