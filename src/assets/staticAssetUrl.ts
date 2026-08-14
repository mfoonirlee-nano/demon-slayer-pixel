const REPOSITORY_ASSET_PREFIX = "assets/";
// The built entry lives in dist/, while repository-owned runtime assets stay beside it.
const DIST_SIBLING_PREFIX = "../";

export function resolveStaticAssetUrl(src: string) {
  if (!src.startsWith(REPOSITORY_ASSET_PREFIX)) return src;

  const distSiblingUrl = `${DIST_SIBLING_PREFIX}${src}`;
  if (typeof document === "undefined") return distSiblingUrl;

  // CSS custom-property URLs are rebased where var() is consumed, so keep them absolute.
  return new URL(distSiblingUrl, document.baseURI).href;
}
