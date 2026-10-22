export function toMarkdownFileName({ title, domain }: { title: string; domain: string }) {
  const base = title.trim() || domain.trim() || "page";
  const safe = base
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${safe || "page"}.md`;
}
