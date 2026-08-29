import {
  createContext,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

// Deliberately not react-router: this site is four static routes with no
// nesting, params, or data loading, so a ~40-line pushState wrapper covers
// it without adding a dependency. netlify.toml already redirects /* to
// /index.html (needed for the pre-existing SPA), and Vite's dev server
// falls back to index.html for unmatched navigations by default, so a
// direct load of e.g. /ecosystem works in both dev and prod.
const NAVIGATE_EVENT = "amarantha:navigate";

const PathContext = createContext<string>("/");

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onChange = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onChange);
    window.addEventListener(NAVIGATE_EVENT, onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener(NAVIGATE_EVENT, onChange);
    };
  }, []);

  return <PathContext.Provider value={path}>{children}</PathContext.Provider>;
}

export function usePath() {
  return useContext(PathContext);
}

export function navigate(to: string) {
  if (to !== window.location.pathname) {
    window.history.pushState({}, "", to);
  }
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
  window.scrollTo(0, 0);
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export function Link({ to, onClick, children, ...rest }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to);
  };

  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
