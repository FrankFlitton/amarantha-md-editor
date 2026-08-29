import { AmaranthaEditor } from "@amarantha/editor";
import { personalWebsiteRegistry } from "@amarantha/mdx";
import { SiteNav } from "./SiteNav";
import { SiteFooter } from "./SiteFooter";

interface ContentPageProps {
  source: string;
}

// Marketing pages are .mdx files rendered read-only through the same
// AmaranthaEditor component the demo edits with — the site is itself a
// dogfooding case for the editor, not a separate static-site pipeline.
export function ContentPage({ source }: ContentPageProps) {
  return (
    <div className="site-page amarantha-app">
      <SiteNav />
      <main className="site-page-content">
        <AmaranthaEditor
          value={source}
          onChange={() => {}}
          mode="rich"
          readOnly
          proseSize="lg"
          componentRegistry={personalWebsiteRegistry}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
