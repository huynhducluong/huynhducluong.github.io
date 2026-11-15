export const adminBrand = {
  name: "Career Hub Admin",
  breadcrumb: "Career Hub",
} as const;

export const adminDocumentTitle = (page?: string): string =>
  page ? `${page} | ${adminBrand.name}` : `${adminBrand.name} | Huynh Duc Luong`;
