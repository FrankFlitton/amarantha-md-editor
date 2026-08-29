import { useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type Status = "idle" | "available" | "installing" | "error";

/**
 * Checks GitHub Releases' latest.json (see tauri.conf.json's
 * plugins.updater.endpoints) once per launch. Silent when there's nothing
 * to report — no update, or the check itself fails (e.g. no releases
 * published yet) — so this never nags a user with a false-negative banner.
 */
export function UpdateBanner() {
  const [status, setStatus] = useState<Status>("idle");
  const [update, setUpdate] = useState<Update | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    check()
      .then((found) => {
        if (found) {
          setUpdate(found);
          setStatus("available");
        }
      })
      .catch(() => {
        // No releases yet, offline, endpoint unreachable — nothing to show.
      });
  }, []);

  if (status === "idle") return null;

  const handleInstall = () => {
    if (!update) return;
    setStatus("installing");
    update
      .downloadAndInstall()
      .then(() => relaunch())
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Update failed");
        setStatus("error");
      });
  };

  return (
    <div className="update-banner" data-testid="update-banner">
      {status === "available" && update && (
        <>
          <span>Amarantha {update.version} is available (you're on {update.currentVersion}).</span>
          <button type="button" onClick={handleInstall}>
            Restart & update
          </button>
        </>
      )}
      {status === "installing" && <span>Downloading update…</span>}
      {status === "error" && <span>Update failed: {error}</span>}
    </div>
  );
}
