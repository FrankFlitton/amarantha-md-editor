import { ContentPage } from "../site/ContentPage";
import source from "../content/product.mdx?raw";

export function ProductPage() {
  return <ContentPage source={source} />;
}
