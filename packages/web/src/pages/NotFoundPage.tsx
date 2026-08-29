import { ContentPage } from "../site/ContentPage";

const source = `# Page not found

There's nothing here. Try the [live demo](/), [product](/product) page,
[ecosystem](/ecosystem) links, or [contact](/contact).
`;

export function NotFoundPage() {
  return <ContentPage source={source} />;
}
