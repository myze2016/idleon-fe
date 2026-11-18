/** Resolve the backend origin without exposing backend configuration to browsers.
 * @param {Record<string, string | undefined>} environment
 */
export function deploymentBackendOrigin(environment = process.env) {
  const vercel = environment.VERCEL === "1";
  const configured = environment.BACKEND_URL?.trim();
  const browserApi = environment.NEXT_PUBLIC_API_URL?.trim();
  if (vercel && !configured) throw new Error("Set BACKEND_URL in Vercel to your Railway backend HTTPS origin");
  if (vercel && browserApi && browserApi !== "/api") throw new Error("Set NEXT_PUBLIC_API_URL=/api in Vercel so authentication uses the same-origin proxy");
  const legacy = browserApi && /^https?:\/\//.test(browserApi) ? browserApi.replace(/\/api\/?$/, "") : undefined;
  let backend;
  try { backend = new URL(configured || legacy || "http://localhost:8000"); }
  catch { throw new Error("BACKEND_URL must be an absolute HTTP(S) origin without /api"); }
  if (!["http:", "https:"].includes(backend.protocol) || backend.username || backend.password || backend.pathname !== "/" || backend.search || backend.hash) {
    throw new Error("BACKEND_URL must be an HTTP(S) origin without credentials, a path, or /api");
  }
  if (vercel && (backend.protocol !== "https:" || ["localhost", "127.0.0.1", "[::1]"].includes(backend.hostname) || backend.hostname.endsWith(".localhost") || backend.hostname.endsWith(".railway.internal"))) {
    throw new Error("Vercel BACKEND_URL must be the public HTTPS Railway domain, not a local or private address");
  }
  return backend.origin;
}
