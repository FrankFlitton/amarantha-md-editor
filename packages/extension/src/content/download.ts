/**
 * Saves edited markdown as a local file download — a Blob + object URL +
 * synthetic `<a download>` click, not the File System Access API or Chrome's
 * `downloads` permission. Deliberately: the extension has no business
 * writing back to whatever host served the original file (a raw GitHub URL,
 * a gist, a bucket), and real filesystem read/write is the native desktop
 * app's job, not this one's.
 */
export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
