// Import only binding contracts: do not replace browser DOM/Response global types.
declare module "cloudflare:workers" {
  export const env: {
    DB: import("@cloudflare/workers-types/index.ts").D1Database;
    FILES: import("@cloudflare/workers-types/index.ts").R2Bucket;
  };
}
