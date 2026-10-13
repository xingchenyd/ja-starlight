import type { PublicCatalogRecord } from "./public-catalog";

let catalogRequest: Promise<PublicCatalogRecord[]> | null = null;
let expiresAt = 0;

export function getPublicCatalog(): Promise<PublicCatalogRecord[]> {
  if (!catalogRequest || Date.now() >= expiresAt) {
    expiresAt = Date.now() + 15000;
    catalogRequest = (async () => {
      const records: PublicCatalogRecord[] = [];
      let hasMore = true;
      for (let page = 1; hasMore; page++) {
        const response = await fetch(`/api/catalog?pageSize=100&page=${page}`, { cache: "no-store" });
        if (!response.ok) throw new Error("公开内容读取失败");
        const data = await response.json();
        if (!Array.isArray(data.records)) throw new Error("公开内容格式不正确");
        records.push(...data.records);
        hasMore = Boolean(data.hasMore);
        if (hasMore && !data.records.length) throw new Error("公开目录分页异常");
      }
      return records;
    })()
      .catch((error) => {
        catalogRequest = null;
        expiresAt = 0;
        throw error;
      });
  }
  return catalogRequest;
}
