const REPOSITORY_ASSET_PREFIX = "assets/";
// The built entry lives in dist/, while repository-owned runtime assets stay beside it.
const DIST_SIBLING_PREFIX = "../";

export function resolveStaticAssetUrl(src: string) {
  if (!src.startsWith(REPOSITORY_ASSET_PREFIX)) return src;
  return `${DIST_SIBLING_PREFIX}${src}`;
}
