# Amarantha — Claude Code Handoff

## Start Here

Amarantha is a text-native rich editor for Markdown and MDX repositories. The durable source of truth is always the original Markdown or MDX file; the visual editor is an excellent way to author it, not a proprietary replacement for it.

Begin with the shared, source-aware document engine. Do not begin by building a desktop shell or a VS Code extension. The first proof of product quality is:

1. Load a real Markdown/MDX file.
2. Make one targeted rich edit.
3. Serialize only the edited region where possible, preserving everything else.
4. Show the exact pending diff.
5. Detect and safely reconcile an external on-disk change.

Inspect the existing repository before choosing a package manager, monorepo layout, parser stack, UI framework, or build commands. Use its existing conventions. Record choices below as decisions/TODOs rather than assuming them.

~~~sh
# From the repository root, after inspection:
# <package-manager> install
# <package-manager> test
# <package-manager> run typecheck
# <package-manager> run lint
~~~

## Product Thesis

Markdown and MDX are durable authoring formats: portable, version-controlled, reviewable, and legible without a particular application. Their limitation is not the format but the authoring experience—people repeatedly translate between punctuation-heavy syntax and document intent.

Amarantha should make Markdown/MDX feel like a capable document editor while preserving the repository file as the canonical artifact. It should support notes, product specifications, technical documentation, diagrams, UI mockups, and repository-specific MDX components without converting them to opaque app data.

Core promise: rich editing improves authorship without replacing Markdown/MDX as source of truth.

## Product Success Criteria: Website Editing and LLM Interoperability

The primary success case is safely authoring the content that powers Frank Flitton’s personal website. The second, equally deliberate success case is making the same repository content easy for an LLM agent to inspect, change, validate, and hand back through normal Git workflows.

### Website-specific target

The current renderer is [renderer.tsx](https://github.com/FrankFlitton/Personal-Website/blob/master/src/src/Content/renderer.tsx). It renders serialized MDX with Next MDX Remote and supplies this component map:

- YouTube
- IFrame
- Img
- Gist
- pre
- NPM
- hr
- code
- Mermaid
- UserJourney
- UserJourneyMap

Amarantha should make these components discoverable as repository-defined MDX blocks and give each one a safe authoring path:

- A configured, supported component gets a rich inspector only after its source syntax, props, children, and examples have been inspected in the website repository.
- An unknown component or an unimplemented property stays source-preserved and source-editable; it must not disappear or be rewritten to generic HTML.
- Mermaid, UserJourney, and UserJourneyMap deserve early visual-editor investigation because the renderer identifies diagram output using the data-diagram attribute and includes it in the image lightbox workflow.
- The component registry must be able to represent the exact source component name and casing, including lower-case mappings such as pre, hr, and code.
- Edit source MDX/content files, never the generated or serialized MDXRemote payload. The renderer’s compiledSource input is a render artifact, not Amarantha’s editable source of truth.

Do not infer component prop shapes from renderer.tsx alone. TODO(decision): inspect the imported render-block files and representative content documents before defining their registry schemas or visual editors.

### LLM-agent interoperability

Amarantha should make changes legible and controllable for agents, not merely usable by a human-rich-editor UI.

- The agent-facing artifact is ordinary Markdown/MDX plus a small, documented declarative component registry; no agent must decode browser/editor state to understand a document.
- Read, inspect, edit, validate, diff, and resolve-conflict operations need stable, typed contracts with source ranges and clear diagnostics.
- Any agent-directed mutation should be expressible as a constrained operation, produce a previewable minimal source diff, and require explicit write confirmation at the host boundary.
- Return structured results for parse failures, unsupported nodes, validation failures, transforms, and conflicts. Do not make an agent infer status from display text.
- Preserve unknown MDX byte-for-byte where feasible so agents can modify one requested region without damaging repository-specific constructs they do not understand.
- Keep component registry schemas inspectable and, where practical, JSON-Schema-compatible or otherwise machine-readable. Do not require evaluation of repository code for discovery.
- Make source ranges and node/component identities stable enough for an agent to cite and re-target an edit after a fresh load; treat stale revisions as conflicts rather than applying blind patches.
- Diff mode must be useful to both human review and automated policy checks: it should expose exact pending file output and why a region was regenerated.

### Measurable success for this target

1. A website content author can add or revise prose, images, embeds, code, Mermaid, and configured journey components without hand-editing punctuation-heavy MDX for ordinary changes.
2. A change to one component or paragraph leaves unrelated sections, imports, component blocks, and intentional formatting untouched.
3. An LLM agent can load a content file plus registry, identify supported/opaque regions, issue a scoped mutation, receive validation/diagnostics, and produce a reviewable Git diff without executing website code.
4. The edited source still passes the website repository’s existing build/content validation after those commands have been identified during repository inspection.
5. Visual editing never compromises the renderer’s existing media/lightbox and diagram behavior; renderer-specific integration tests are added only after the wider repo is inspected.

## UX Problem

Most Markdown editors fail in one or both directions:

- Syntax is always revealed, forcing authors to parse punctuation rather than write.
- Rich preview is a narrow split pane, visually secondary and disconnected from the edit.
- Local edits reflow or regenerate whole documents, producing review-hostile diffs and losing intentional formatting.

Amarantha needs a primary, full-width rich canvas for direct manipulation of headings, lists, links, tables, calls, diagrams, code blocks, and supported MDX components. Source remains a first-class escape hatch, and pending output is inspectable as a diff.

## Principles

### Text-native and durable

- Files on disk are authoritative; no proprietary representation is the only copy.
- Open existing files, preserve unfamiliar syntax, and save valid source.
- Any metadata is optional and reconstructible, never required outside Amarantha.
- Git branches, diffs, merges, and review are first-class workflows.

### Source-preserving minimal-diff transforms

- Preserve untouched source segments wherever possible: whitespace, wrapping, frontmatter style, comments, unfamiliar nodes, and user formatting.
- Never pretty-print a whole file following a local edit.
- Apply the smallest faithful source replacement for intentional changes.
- Where regeneration cannot be avoided, identify its scope in Diff mode before write when practical.

### Rich editing without lock-in

- Standard Markdown gets direct visual editing.
- MDX remains MDX: imports/exports, JSX, and expressions are not flattened into HTML or proprietary nodes.
- Repository configuration declares known components and their safe editable properties.

## Rich, Source, and Diff Modes

| Mode | Purpose | Required behavior |
| --- | --- | --- |
| Rich | Primary visual authoring | Direct editing of common Markdown and configured MDX; unknown syntax is preserved safely. |
| Source | Precise text editing | Full-fidelity source; changes update shared document state and can trigger projection rebuilds. |
| Diff | Review before write | Compare pending serialized output with last loaded/saved source; emphasize local edits and regenerated regions. |

These modes must share one document model and engine, rather than becoming separate editors.

## Markdown + MDX Rich Editing

Use a layered model:

- A source/syntax layer retains loaded text and source provenance.
- A semantic document layer represents editable Markdown and MDX.
- A rich-editor projection renders that semantic layer and issues structured mutations.
- A serializer applies source-preserving patches when possible and conservative regeneration only for changed constructs.

Support normal Markdown plus a deliberately defined subset of MDX imports/exports, JSX elements, and expressions. Unrecognized, incomplete, or ambiguous MDX must become source-backed opaque regions—not be discarded, normalized, or converted to HTML.

### Frontmatter as skill-friendly document context

Frontmatter is important document context, especially for agent/skill workflows. Treat it as structured, source-preserving data rather than a blob to regenerate:

- Provide a rich property editor for safe scalar and collection edits, alongside a source view for advanced YAML or repository-specific conventions.
- Preserve key order, comments, quoting, multiline form, whitespace, and unfamiliar values whenever they are outside the intended edit.
- Allow repository/skill configuration to declare known frontmatter fields, descriptions, validation rules, and agent-facing intent without making those declarations mandatory for every document.
- Expose parsed frontmatter plus preservation/validation diagnostics through the shared engine, so agents can reason about document metadata without scraping rendered text.
- Do not silently coerce dates, booleans, nulls, arrays, or custom YAML expressions. Unsupported or invalid frontmatter remains editable in Source mode.

### Per-repository JSX/component registry

Each repository needs a declarative registry for recognized JSX components, editable props, visual editor support, and fallback behavior. This is repository configuration, not a global catalog.

~~~ts
export interface ComponentRegistry {
  resolve(name: string): ComponentDefinition | undefined;
  list?(): readonly ComponentDefinition[];
}

export interface ComponentDefinition {
  name: string;
  displayName?: string;
  props: Record<string, ComponentPropDefinition>;
  children?: "none" | "markdown" | "mdx" | "opaque";
  editor?: ComponentEditorFactory;
  sourceFallback: "preserve" | "source-only";
}

export interface ComponentPropDefinition {
  type: "string" | "number" | "boolean" | "enum" | "json" | "expression";
  required?: boolean;
  values?: readonly string[];
  description?: string;
}
~~~

Do not execute arbitrary repository JavaScript merely to discover or render components. Treat the registry as declarative data, or make executable extensions an explicit trusted capability.

### Later pass: promote an unknown JSX region into an editable module

In a later pass, make adding a custom MDX block as straightforward as clicking an unknown JSX region and choosing an action such as “Open component source.”

The intended workflow:

1. Amarantha identifies an opaque JSX element and shows its component name, source range, and reason it lacks a rich editor.
2. The author clicks it and opens the corresponding TSX module in the host editor, subject to workspace trust and repository resolution rules.
3. Amarantha targets the module’s default export as the primary component implementation, while presenting an explicit fallback when no default export can be resolved.
4. The author can add or update the declarative registry entry and return to the MDX document; Amarantha refreshes the component contract and rich projection.

This is a developer-assist flow, not automatic code execution or component generation. TODO(decision): define import/path resolution, aliases, monorepo boundaries, export analysis, unsaved-module behavior, and the default-export fallback after inspecting the website repository and both hosts. The workflow must work through a source-code navigation API rather than allowing an untrusted MDX file to open arbitrary paths.

## Rich Code-Block Editor Abstraction

Code blocks need language-aware rich editors without leaking language tooling into the document core. A block editor owns interaction; the core owns fences, info strings, content, and source preservation.

~~~ts
export interface BlockEditorRegistry {
  resolve(context: CodeBlockContext): RichBlockEditor | undefined;
}

export interface CodeBlockContext {
  language?: string;
  meta?: string;
  value: string;
  source: SourceRange;
}

export interface RichBlockEditor {
  readonly id: string;
  canEdit(context: CodeBlockContext): boolean;
  mount(host: HTMLElement, context: CodeBlockContext, api: BlockEditorApi): BlockEditorSession;
}

export interface BlockEditorApi {
  update(next: { value: string; language?: string; meta?: string }): void;
  requestSourceMode(reason?: string): void;
}

export interface BlockEditorSession {
  destroy(): void;
}
~~~

TODO(decision): choose plugin discovery and sandboxing after inspecting host capabilities. Do not presume a runtime module-loading system.

### Mermaid visual / Miro-like flowchart editing

For fenced Mermaid blocks, provide a Miro-like direct-manipulation flowchart editor where feasible: create nodes, connect them, label edges, position elements, and edit supported styles.

Mermaid text remains the serialization format. The graph is an editor projection, not an alternate canonical format. When a diagram has syntax or semantics outside the supported visual subset, preserve its source and offer Source mode rather than destructively rewriting it.

Evaluate [XYFlow](https://github.com/xyflow/xyflow) for canvas interaction and [Mermaid](https://github.com/mermaid-js/mermaid) for rendering/parsing/serialization. Neither library’s internal graph model should become the Amarantha core model.

TODO(decision): define the v0 Mermaid subset and precise source-only fallback rules.

### ASCII diagrams and UI mockups

Support ASCII diagram and terminal/UI-mockup code blocks through a grid-oriented editor where safe. Preserve monospaced text, whitespace, box-drawing characters, alignment, and raw text. Start source-first with fixed-width editing, selection, and line/box helpers.

Do not claim automatic semantic understanding of arbitrary ASCII art in v0. Every operation must serialize accurate source text.

## Hosts: One Engine, Two First-Class Surfaces

### macOS desktop host

Build a macOS desktop app using [Tauri](https://github.com/tauri-apps/tauri), subject to repository/toolchain inspection. The host provides windowing, local file access, watchers, workspace trust, and native integration. It must not invent document semantics separate from the shared engine.

### VS Code host

Build a VS Code CustomTextEditorProvider backed by a webview. Consult the official [custom editor sample](https://github.com/microsoft/vscode-extension-samples/tree/main/custom-editor-sample). It must reuse the document model, serializer, component-registry protocol, and conflict behavior from the desktop host.

VS Code text documents remain authoritative. Integrate with native undo/redo, dirty state, save, and external-change behavior rather than creating a competing lifecycle.

### Host boundary

~~~ts
export interface EditorHost {
  readonly kind: "desktop" | "vscode" | string;
  readDocument(uri: DocumentUri): Promise<LoadedDocument>;
  writeDocument(request: WriteRequest): Promise<WriteResult>;
  watchDocument(uri: DocumentUri, onChange: (event: ExternalChange) => void): Disposable;
  getWorkspaceTrust(): Promise<WorkspaceTrust>;
  resolveComponentRegistry(uri: DocumentUri): Promise<ComponentRegistry>;
}

export interface LoadedDocument {
  uri: DocumentUri;
  text: string;
  revision: string;
  encoding?: string;
  lineEnding?: "lf" | "crlf";
}

export interface WriteRequest {
  uri: DocumentUri;
  baseRevision: string;
  text: string;
  reason: "save" | "format" | "explicit-transform";
}

export type WriteResult =
  | { ok: true; revision: string }
  | { ok: false; reason: "conflict" | "permission" | "io"; current?: LoadedDocument };
~~~

Names are illustrative. Match URI, disposal, and asynchronous conventions found in the repository.

## Proposed Package Architecture

| Package | Responsibility |
| --- | --- |
| @amarantha/core | Source-aware model, parsing adapters, transformations, serializer/patching, diff metadata, conflict primitives, shared types. No DOM, host API, or editor-framework dependency. |
| @amarantha/editor | Rich/Source/Diff orchestration and UI-agnostic editor controller; framework bindings only as needed. |
| @amarantha/blocks | Rich block contracts and implementations, including Mermaid and ASCII helpers; no host dependencies. |
| @amarantha/mdx | MDX parsing/serialization adapters, JSX/component registry types and configuration-loading boundary. |
| @amarantha/desktop | Tauri/macOS shell, filesystem adapter, file watching, desktop workspace trust UX. |
| @amarantha/vscode | VS Code extension, CustomTextEditorProvider, webview bridge, VS Code document lifecycle adapter. |

Dependencies point inward. Desktop and VS Code adapt to shared behavior; neither should fork parsing or serialization logic.

## Proposed Core Interfaces

These are a starting point, not a demand to implement every type verbatim.

~~~ts
export type DocumentUri = string;

export interface SourceRange {
  start: number;
  end: number;
}

export interface AmaranthaDocument {
  uri?: DocumentUri;
  source: string;
  ast: DocumentNode;
  revision?: string;
}

export interface DocumentNode {
  id: string;
  type: string;
  source?: SourceRange;
  children?: readonly DocumentNode[];
  // TODO(decision): define a discriminated union from real parser needs.
}

export interface DocumentEngine {
  load(input: { text: string; uri?: DocumentUri; revision?: string }): ParseResult;
  apply(document: AmaranthaDocument, operation: DocumentOperation): TransformResult;
  serialize(document: AmaranthaDocument, options?: SerializeOptions): SerializeResult;
  diff(baseText: string, nextText: string): DocumentDiff;
}

export type DocumentOperation =
  | { type: "replace-text"; target: SourceRange; text: string }
  | { type: "replace-node"; nodeId: string; node: DocumentNode }
  | { type: "source-edit"; range: SourceRange; text: string };

export interface ParseResult {
  document: AmaranthaDocument;
  diagnostics: readonly Diagnostic[];
}

export interface TransformResult {
  document: AmaranthaDocument;
  affected: readonly SourceRange[];
  diagnostics: readonly Diagnostic[];
}

export interface SerializeOptions {
  strategy?: "minimal-diff" | "regenerate-affected";
}

export interface SerializeResult {
  text: string;
  patches: readonly SourcePatch[];
  diagnostics: readonly Diagnostic[];
}

export interface SourcePatch {
  range: SourceRange;
  replacement: string;
  reason: string;
}

export interface DocumentDiff {
  changedRanges: readonly SourceRange[];
}

export interface Diagnostic {
  severity: "info" | "warning" | "error";
  message: string;
  source?: SourceRange;
}
~~~

TODO(decision): select a diff data structure and extend operations only after proving core round-trip invariants.

## MDXEditor and Lexical: Fork, but Keep APIs Independent

Evaluate forking [MDXEditor](https://github.com/mdx-editor/editor) to accelerate rich Markdown/MDX editing. Also inspect [Lexical](https://github.com/facebook/lexical), on which MDXEditor is built, plus the maintained-fork example [nkzw-tech/mdx-editor](https://github.com/nkzw-tech/mdx-editor).

Explicit rule: a fork can be an implementation substrate, but Amarantha public and cross-package APIs must remain independent of MDXEditor and Lexical internals.

- No Lexical node, editor-state, command, or plugin type in public core contracts.
- No persisted Amarantha representation requiring Lexical or MDXEditor to read it.
- Adapter code may translate the Amarantha model and operations into a selected editor framework.
- Isolate framework-specific code behind editor adapters so replacement/upstreaming remains possible.
- Record fork/upstream strategy, license review, patch maintenance, and versioning as explicit decisions.

## External File Edits and Conflicts

Files can change through Git, another editor, formatters, generators, or collaboration tools.

- Track each document’s loaded base revision/text.
- When an external update arrives while the document is clean, reload and reproject safely.
- When it arrives with unsaved local edits, never overwrite silently.
- Provide deliberate choices: reload/discard local edits, compare, attempt a three-way reconciliation, or copy local changes to a safe buffer.
- If an external file becomes invalid MDX, retain its source plus diagnostics; never discard the new content.
- Map the behavior to each host’s native lifecycle, especially VS Code dirty documents and undo/redo.

TODO(decision): choose revision fingerprints and merge algorithm after testing filesystem semantics and VS Code APIs.

## Plugin Security and Workspace Trust

JSX component registries, rich block editors, and repository extensions are a security boundary.

- Default to declarative configuration; never auto-execute repository code to inspect components.
- Require explicit workspace trust before executable extensions, custom block runtimes, network access, or broad filesystem capability.
- Give extensions least-privilege capabilities and visible trust/status feedback.
- Validate and sanitize data crossing host/webview boundaries.
- Respect VS Code workspace trust and webview security; define an equivalent explicit trust state in desktop.
- Document extension provenance, permissions, and failure behavior.

## v0 Scope and Acceptance Criteria

### v0 must deliver

- Open/save Markdown and a deliberately defined MDX subset.
- Rich editing for paragraphs, headings, emphasis/strong, links, lists, blockquotes, fenced code, and tables only where fidelity tests prove it safe.
- Rich, Source, and Diff modes backed by one document state.
- Targeted source-preserving edits, leaving unrelated tested text unchanged.
- Opaque/source-only preservation for unknown Markdown/MDX.
- Declarative per-repository JSX registry with safe unknown-component fallback.
- A code-block registry and one basic implementation path; Mermaid and ASCII may begin source-first.
- One complete host selected after inspection; shared engine structured for the second host. Validate parity if both can be delivered safely.
- External-change detection and no-silent-overwrite conflict flow.

### Acceptance criteria

1. Loading then saving an unchanged supported fixture yields byte-identical output, except documented/test-approved cases such as encoding normalization.
2. A local rich edit changes only the expected source region in representative fixtures.
3. Unknown MDX and unfamiliar JSX survive a rich edit/save cycle unchanged.
4. Source-mode edits appear correctly in Rich mode, or a clear source-only fallback is presented without loss.
5. Diff mode shows exact pending serialized output.
6. External changes cannot be silently overwritten while local edits exist.
7. Untrusted workspaces do not enable executable extensions.
8. The shared engine suite runs independent of desktop and VS Code hosts.

## Explicit Non-goals for v0

- A proprietary file format, cloud backend, accounts, or collaboration service.
- Full visual rendering/execution of arbitrary React/MDX components.
- Perfect visual editing for all Mermaid syntax, arbitrary ASCII art, or every code-block language.
- Whole-file formatting or style normalization.
- Replacing VS Code’s general editor, Git UI, or merge tools.
- Arbitrary plugins without a reviewed trust/capability design.
- Lossy MDX conversion into HTML, JSON, or editor-framework state.
- Mobile, Windows, Linux, browser hosting, or collaborative cursors unless separately prioritized.

## Milestones

### 0 — Discovery and decisions

Inspect repository/toolchain/licenses/tests/UI conventions and any prototype. Decide package manager, workspace layout, parser/AST path, UI boundaries, and first host. Add a concise decision log. Preserve existing conventions.

### 1 — Core round-trip engine

Implement source loading, parsing adapter, provenance, targeted operations, serialization, and diff metadata. Build fixtures spanning ordinary Markdown, frontmatter, formatting edge cases, MDX imports/exports/JSX/expressions, unknown syntax, Mermaid, and ASCII blocks. Establish byte-preservation/minimal-diff tests before broad UI work.

### 2 — Shared editor and modes

Implement Rich/Source/Diff shell and a small safe rich-MD subset. Keep the chosen rich-editor framework behind adapters. Define source-only/error fallback.

### 3 — MDX registry and rich blocks

Add declarative registry loading and limited component inspectors. Add the block-editor registry. Prototype Mermaid and ASCII behind strict preservation fallbacks.

### 4 — First host and conflicts

Complete the selected host’s lifecycle: open/save/watch/conflicts/workspace trust/undo-redo mapping. Test actual external modifications.

### 5 — Second-host parity

Implement the remaining host as an adapter to the same engine and run shared behavior/round-trip coverage across integrations where feasible.

## Round-trip Fidelity Tests

Treat fixture preservation and diff quality as product tests.

- Identity: parse → serialize without edits is byte-identical for supported and opaque fixtures.
- Localized edits: edit paragraphs, lists, links, and component props; assert expected spans only.
- Formatting: retain line endings, blank lines, ordered-list style, fence markers/info strings, indentation, frontmatter presentation, and comments outside the edit.
- MDX: imports, exports, expressions, unknown JSX, nested children, and malformed/incomplete MDX remain intact.
- Blocks: code, Mermaid, and ASCII retain raw source when visual editing cannot model them safely.
- Modes: Rich ↔ Source ↔ Diff retains document meaning and pending output.
- Conflicts: external fixture modification validates reload, dirty conflict, compare, and no overwrite.
- Later: fuzz/generated fragment tests to find lossiness; turn failures into permanent fixtures.

TODO(decision): where byte identity cannot hold, define normalized comparison narrowly and justify every exception in tests or the decision log.

## First 10 Tasks

- [ ] Inspect repository conventions and identify the least-disruptive workspace layout.
- [ ] Create package boundaries (or equivalent directories) for core, editor, blocks, mdx, desktop, and vscode without forcing unverified tooling.
- [ ] Add a decision log for parser, rich-editor integration, first host, serialization, and MDXEditor fork/upstream/licensing.
- [ ] Build Markdown/MDX fixtures, including unsupported and malformed examples.
- [ ] Define and implement the smallest core load/operation/serialize/diff contracts compatible with the repo.
- [ ] Implement unchanged-file round-trip tests before broad rich editing.
- [ ] Implement one targeted transform (for example, paragraph or heading text) and assert a localized source diff.
- [ ] Add provenance/opaque-node handling for unsupported MDX/JSX with preservation tests.
- [ ] Build a minimal Rich/Source/Diff shell connected to the shared engine; keep framework integration behind adapters.
- [ ] Implement a thin first-host adapter with file revision/conflict detection and workspace-trust stub/native integration, then document route to second-host parity.

## Reference Repositories

- [MDXEditor](https://github.com/mdx-editor/editor)
- [Lexical](https://github.com/facebook/lexical)
- [Tauri](https://github.com/tauri-apps/tauri)
- [VS Code custom editor sample](https://github.com/microsoft/vscode-extension-samples/tree/main/custom-editor-sample)
- [XYFlow](https://github.com/xyflow/xyflow)
- [Mermaid](https://github.com/mermaid-js/mermaid)
- [Maintained MDXEditor fork example: nkzw-tech/mdx-editor](https://github.com/nkzw-tech/mdx-editor)
