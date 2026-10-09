// Replaces the Node-only adapter in the Cloudflare build.
export function getNodeResources() {
  throw new Error('This build uses Cloudflare bindings, not local files.');
}
