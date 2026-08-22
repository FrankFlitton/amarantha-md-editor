import type { ComponentDefinition } from "@amarantha/core";
import { createRegistry } from "./createRegistry";

/**
 * Component definitions for Frank's personal website content repo
 * (github.com/FrankFlitton/Personal-Website, src/src/Content/renderer.tsx).
 *
 * Grounded in actual usage across /Users/franklinflitton/Git/Personal-Website/content
 * (35 files) — prop shapes here reflect what's really written, not what the
 * renderer's TSX types merely allow. `pre`/`code`/`hr` from the renderer's
 * component map override native markdown constructs (fenced code, inline
 * code, thematic breaks) rather than being literal JSX tags authors type,
 * so they're not registry entries here.
 *
 * This is a temporary hardcoded stand-in for the RFC's real per-repository
 * `.amarantha/config` discovery (Milestone 3) — good enough to QA the
 * rich JSX props editor against real content today.
 */
const definitions: ComponentDefinition[] = [
  {
    name: "YouTube",
    kind: "flow",
    props: {
      id: { type: "string", required: true, description: "YouTube video ID" },
    },
  },
  {
    name: "IFrame",
    kind: "flow",
    props: {
      src: { type: "string", required: true },
    },
  },
  {
    name: "Img",
    kind: "flow",
    props: {
      src: { type: "string", required: true },
      alt: { type: "string" },
      framed: { type: "boolean" },
      tall: { type: "boolean" },
    },
  },
  {
    name: "Gist",
    kind: "flow",
    props: {
      id: { type: "string", required: true, description: "GitHub Gist ID" },
    },
  },
  {
    name: "NPM",
    kind: "flow",
    props: {
      id: { type: "string", required: true, description: "npm package name" },
      text: { type: "string", required: true },
    },
  },
  {
    name: "Mermaid",
    kind: "flow",
    props: {
      chart: { type: "expression", required: true, description: "Mermaid diagram source" },
      title: { type: "string" },
    },
  },
  {
    name: "UserJourney",
    kind: "flow",
    props: {
      title: { type: "string", required: true },
      actor: { type: "string" },
      sections: {
        type: "expression",
        required: true,
        description: "Array<{ name: string; tasks: { label: string; score: number }[] }>",
      },
    },
  },
  {
    name: "UserJourneyMap",
    kind: "flow",
    props: {
      title: { type: "string" },
      persona: { type: "expression", description: "{ name, role, bio, photo? }" },
      expectations: { type: "expression", description: "string[]" },
      phases: {
        type: "expression",
        required: true,
        description: "{ name: string; steps: { id, description, sentiment, quote? }[] }[]",
      },
      showChart: { type: "boolean" },
    },
  },
];

export const personalWebsiteRegistry = createRegistry(definitions);
