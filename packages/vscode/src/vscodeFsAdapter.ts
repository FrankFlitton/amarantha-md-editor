import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { FsAdapter } from "@amarantha/core";

/** Node-fs-backed FsAdapter, for discoverWorkspaceConfig — the extension
 *  host has real filesystem access, unlike a VS Code webview. */
export const vscodeFsAdapter: FsAdapter = {
  exists: (p) =>
    fs.access(p).then(
      () => true,
      () => false
    ),
  readTextFile: (p) => fs.readFile(p, "utf8"),
  dirname: (p) => Promise.resolve(path.dirname(p)),
  join: (...parts) => Promise.resolve(path.join(...parts)),
};
