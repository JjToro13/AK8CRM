import { useClientStatusCatalog } from "../../hooks/useClientStatusCatalog";

export default function ClientStatusCatalogLoader() {
  useClientStatusCatalog();
  return null;
}
