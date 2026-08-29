import { ContentPage } from "../site/ContentPage";
import source from "../content/contact.mdx?raw";

export function ContactPage() {
  return <ContentPage source={source} />;
}
