import type { ThemeFamily } from "@amarantha/core";
import { THEME_FAMILIES } from "@amarantha/theme";
import { Link, usePath } from "./router";
import { useSiteTheme } from "./theme";

const NAV_LINKS: { to: string; label: string }[] = [
  { to: "/product", label: "Product" },
  { to: "/ecosystem", label: "Ecosystem" },
  { to: "/contact", label: "Contact" },
];

export function SiteNav() {
  const path = usePath();
  const { family, setFamily, dark, setDark } = useSiteTheme();

  return (
    <nav className="web-toolbar site-nav" aria-label="Site">
      <Link to="/" className="web-brand site-nav-brand">
        Amarantha
      </Link>

      <div className="web-toolbar-group" role="group" aria-label="Marketing pages">
        {NAV_LINKS.map(({ to, label }) => (
          <Link key={to} to={to} className="site-nav-link" aria-current={path === to ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </div>

      <span className="web-toolbar-spacer" />

      <select
        aria-label="Theme"
        value={family}
        onChange={(event) => setFamily(event.target.value as ThemeFamily)}
      >
        {THEME_FAMILIES.map(({ family: familyOption, label }) => (
          <option key={familyOption} value={familyOption}>
            {label}
          </option>
        ))}
      </select>

      <button type="button" aria-pressed={dark} onClick={() => setDark((value) => !value)}>
        {dark ? "Dark" : "Light"}
      </button>

      <span className="web-toolbar-divider" aria-hidden="true" />

      <a
        className="web-toolbar-link"
        href="https://github.com/FrankFlitton/amarantha-md-editor"
        target="_blank"
        rel="noreferrer"
      >
        GitHub
      </a>
    </nav>
  );
}
