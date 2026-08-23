import { useEffect, useRef, useState } from "react";
import "./mermaid-diagram.css";

// Dynamically imported, not a static top-level import: mermaid pulls in a
// large dependency tree (katex, cytoscape, ...) for diagram types most
// documents never use — bundling it eagerly added ~700KB to the main
// chunk. Loaded once, on first actual use of a Mermaid component.
let mermaidModule: typeof import("mermaid") | null = null;
async function loadMermaid() {
  mermaidModule ??= await import("mermaid");
  return mermaidModule.default;
}

let initializedDark: boolean | null = null;

async function ensureInitialized(dark: boolean) {
  const mermaid = await loadMermaid();
  if (initializedDark !== dark) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: dark ? "dark" : "default",
    });
    initializedDark = dark;
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
 * light/dark class (see App.tsx) to pick a matching Mermaid theme, since
 * Mermaid has its own separate theming system rather than reading --am-*
 * tokens.
 */
export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = chart.trim();
    if (!trimmed) {
      setError(null);
      if (containerRef.current) containerRef.current.innerHTML = "";
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      const dark = document.querySelector(".amarantha-app")?.classList.contains("dark") ?? false;
      ensureInitialized(dark)
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
  }, [chart]);

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
