import { Link } from "./router";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} Amarantha</span>
      <span className="site-footer-links">
        <Link to="/">Demo</Link>
        <Link to="/product">Product</Link>
        <Link to="/ecosystem">Ecosystem</Link>
        <Link to="/contact">Contact</Link>
        <a href="https://github.com/FrankFlitton/amarantha-md-editor" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </span>
    </footer>
  );
}
