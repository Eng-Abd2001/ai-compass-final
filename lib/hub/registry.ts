export type ToolId = "sanitizer" | "sniper" | "diff" | "exif" | "qr" | "palette" | "mockup" | "chat" | "calorie" | "budget" | "swiss" | "decision";
export type HubGroup = "text" | "studio" | "life" | "dev";
export type Mode = "all" | "dev" | "creator" | "daily";
export type HubTool = { id: ToolId; group: HubGroup; icon: string; tags: Mode[]; wide?: boolean };

/** The 12 tools, in default display order. `tags` decide what the workspace filter moves to the front. */
export const HUB_TOOLS: readonly HubTool[] = [
  { id: "sanitizer", group: "text", icon: "🧹", tags: ["creator", "daily"], wide: true },
  { id: "sniper", group: "text", icon: "🎯", tags: ["dev", "creator"] },
  { id: "diff", group: "text", icon: "🔀", tags: ["dev"] },
  { id: "exif", group: "studio", icon: "🛡️", tags: ["creator", "daily"] },
  { id: "qr", group: "studio", icon: "📶", tags: ["creator", "daily", "dev"], wide: true },
  { id: "palette", group: "studio", icon: "🎨", tags: ["creator", "dev"] },
  { id: "mockup", group: "studio", icon: "🖼️", tags: ["creator", "dev"], wide: true },
  { id: "chat", group: "life", icon: "💬", tags: ["daily", "creator"] },
  { id: "calorie", group: "life", icon: "🥗", tags: ["daily"] },
  { id: "budget", group: "life", icon: "💸", tags: ["daily"] },
  { id: "swiss", group: "dev", icon: "🛠️", tags: ["dev"], wide: true },
  { id: "decision", group: "dev", icon: "⚖️", tags: ["daily", "dev"] },
];
export const MODES: readonly Mode[] = ["all", "dev", "creator", "daily"];
export const isToolId = (s: string): s is ToolId => HUB_TOOLS.some((t) => t.id === s);

/** Tools matching the mode first (stable), the rest after them. Nothing is removed. */
export function orderFor(mode: Mode): HubTool[] {
  if (mode === "all") return [...HUB_TOOLS];
  const hit = HUB_TOOLS.filter((t) => t.tags.includes(mode));
  return [...hit, ...HUB_TOOLS.filter((t) => !t.tags.includes(mode))];
}
