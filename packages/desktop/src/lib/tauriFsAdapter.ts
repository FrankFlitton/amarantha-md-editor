import { exists, readTextFile } from "@tauri-apps/plugin-fs";
import { dirname, join } from "@tauri-apps/api/path";
import type { FsAdapter } from "@amarantha/core";

/** The Tauri-backed FsAdapter used by @amarantha/core's config discovery. */
export const tauriFsAdapter: FsAdapter = {
  exists,
  readTextFile,
  dirname,
  async join(...parts) {
    return join(...parts);
  },
};
