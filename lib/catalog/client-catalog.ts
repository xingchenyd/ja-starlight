import type { PublicCatalogRecord } from "./public-catalog";

let catalogRequest: Promise<PublicCatalogRecord[]> | null = null;

export function getPublicCatalog(): Promise<PublicCatalogRecord[]> {
  if (!catalogRequest) {
    catalogRequest = fetch("/api/catalog?pageSize=100")
      .then((response) => {
        if (!response.ok) throw new Error("公开内容读取失败");
        return response.json();
      })
      .then((data) =>
        Array.isArray(data.records)
          ? (data.records as PublicCatalogRecord[])
          : [],
      )
      .catch((error) => {
        catalogRequest = null;
        throw error;
      });
  }
  return catalogRequest;
}
