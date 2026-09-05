import { useEffect, useRef, useState } from "react";
import "./mermaid-diagram.css";

// Dynamically imported, not a static top-level import: mermaid pulls in a
// large dependency tree (katex, cytoscape, ...) for diagram types most
// documents never use — bundling it eagerly added ~700KB to the main
// chunk. Loaded once, on first actual use of a Mermaid component.
type MermaidLoader = () => Promise<typeof import("mermaid")>;

let customLoader: MermaidLoader | null = null;

/**
 * Overrides how the mermaid module gets loaded. Web/VS Code/desktop never
 * call this and keep the plain `import("mermaid")` below — their bundlers
 * emit that as a same-origin chunk a relative dynamic import can reach.
 * A Chrome extension content script can't: it's a classic (non-module)
 * script, so a bare `import("mermaid")` there resolves against the *host
 * page's* origin, not the extension's own packaged files, and 404s. The
 * extension calls this once at startup with a loader that fetches its own
 * bundled chunk via `chrome.runtime.getURL(...)` instead.
 */
export function setMermaidLoader(loader: MermaidLoader): void {
  customLoader = loader;
}

let mermaidModule: typeof import("mermaid") | null = null;
async function loadMermaid() {
  mermaidModule ??= await (customLoader ? customLoader() : import("mermaid"));
  return mermaidModule.default;
}

const AM_VARS = [
  "--am-bg",
  "--am-surface",
  "--am-border",
  "--am-text",
  "--am-text-muted",
  "--am-accent",
  "--am-accent-text",
] as const;

type AmVarName = (typeof AM_VARS)[number];
type AmVars = Record<AmVarName, string>;

// Matches tokens.css's `:root:not([data-theme])` light fallback, used when
// a custom property can't be read (e.g. jsdom in tests, or a detached node).
const AM_FALLBACK: AmVars = {
  "--am-bg": "#fbfbfa",
  "--am-surface": "#f3f2ef",
  "--am-border": "#e5e5e3",
  "--am-text": "#0f0f0f",
  "--am-text-muted": "#6b6b68",
  "--am-accent": "#d97757",
  "--am-accent-text": "#fbfbfa",
};

function readAmVars(el: Element | null): AmVars {
  const style = getComputedStyle(el ?? document.documentElement);
  const vars = {} as AmVars;
  for (const name of AM_VARS) {
    vars[name] = style.getPropertyValue(name).trim() || AM_FALLBACK[name];
  }
  return vars;
}

// Mermaid has its own theming system rather than reading CSS custom
// properties, so this maps the app's --am-* tokens onto mermaid's "base"
// theme (the only preset that honors a full themeVariables override) —
// this is what makes diagrams match every theme family/mode, not just a
// light/dark split.
function mermaidThemeVariables(v: AmVars) {
  return {
    background: v["--am-bg"],
    mainBkg: v["--am-surface"],
    primaryColor: v["--am-surface"],
    primaryTextColor: v["--am-text"],
    primaryBorderColor: v["--am-border"],
    secondaryColor: v["--am-surface"],
    tertiaryColor: v["--am-bg"],
    lineColor: v["--am-text-muted"],
    textColor: v["--am-text"],
    nodeBorder: v["--am-border"],
    clusterBkg: v["--am-surface"],
    clusterBorder: v["--am-border"],
    titleColor: v["--am-text"],
    edgeLabelBackground: v["--am-bg"],
    actorBkg: v["--am-surface"],
    actorBorder: v["--am-border"],
    actorTextColor: v["--am-text"],
    actorLineColor: v["--am-text-muted"],
    signalColor: v["--am-text"],
    signalTextColor: v["--am-text"],
    labelBoxBkgColor: v["--am-surface"],
    labelBoxBorderColor: v["--am-border"],
    labelTextColor: v["--am-text"],
    loopTextColor: v["--am-text"],
    noteBkgColor: v["--am-accent"],
    noteTextColor: v["--am-accent-text"],
    noteBorderColor: v["--am-border"],
    activationBkgColor: v["--am-surface"],
    activationBorderColor: v["--am-border"],
  };
}

let initializedSignature: string | null = null;

async function ensureInitialized(vars: AmVars) {
  const mermaid = await loadMermaid();
  const signature = JSON.stringify(vars);
  if (initializedSignature !== signature) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: "base",
      themeVariables: mermaidThemeVariables(vars),
    });
    initializedSignature = signature;
  }
  return mermaid;
}

let renderSeq = 0;

export interface MermaidDiagramProps {
  chart: string;
}

/**
 * Live preview for a Mermaid diagram source string: re-renders to SVG as
 * the user edits the chart field, debounced so mid-typing invalid syntax
 * does not flash an error on every keystroke. Reads the app's current
 * --am-* theme tokens (see tokens.css) to build a matching Mermaid theme,
 * and re-renders whenever the app root's theme attributes change, so the
 * diagram tracks theme switches even without a chart edit.
 */
export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [themeTick, setThemeTick] = useState(0);

  useEffect(() => {
    const targets = new Set<Element>([document.documentElement]);
    const appRoot = containerRef.current?.closest(".amarantha-app");
    if (appRoot) targets.add(appRoot);

    const observer = new MutationObserver(() => setThemeTick((t) => t + 1));
    for (const target of targets) {
      observer.observe(target, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const trimmed = chart.trim();
    if (!trimmed) {
      setError(null);
      if (containerRef.current) containerRef.current.innerHTML = "";
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      const vars = readAmVars(containerRef.current);
      ensureInitialized(vars)
        .then((mermaid) => {
          if (cancelled) return;
          const id = `amarantha-mermaid-${++renderSeq}`;
          return mermaid.render(id, trimmed);
        })
        .then((result) => {
          if (cancelled || !result || !containerRef.current) return;
          const { svg, bindFunctions } = result;
          containerRef.current.innerHTML = svg;
          bindFunctions?.(containerRef.current);
          setError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "Invalid diagram syntax");
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [chart, themeTick]);

  const empty = !chart.trim();

  return (
    <div className="amarantha-mermaid-preview" data-testid="mermaid-preview" contentEditable={false}>
      {empty && (
        <div className="amarantha-mermaid-empty" data-testid="mermaid-empty">
          No diagram yet — switch to Edit to add chart source.
        </div>
      )}
      {error && (
        <div className="amarantha-mermaid-error" data-testid="mermaid-error">
          {error}
        </div>
      )}
      <div ref={containerRef} className="amarantha-mermaid-canvas" data-testid="mermaid-canvas" />
    </div>
  );
}
