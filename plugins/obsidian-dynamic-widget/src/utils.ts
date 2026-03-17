export function normalizeAreasFrontmatter(
  areas: string | string[],
): string[] {
  return typeof areas === "string" ? [areas] : areas;
}

export function simplifyWikiLink(link: string): string {
  return link.replace(/\[\[|\]\]/g, "");
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
