import siteCfg from "@/data/site.generated.json";

const env = process.env;
export const SITE_URL = (
  env.NEXT_PUBLIC_SITE_URL ||
  (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");

/** Name, description, colour and contact email come from content/site.txt. */
const cfg = siteCfg as unknown as { name: string; description: [string, string]; themeColor: string; contactEmail: string };
export const SITE_NAME = cfg.name;
export const SITE_DESCRIPTION = cfg.description[0];
export const THEME_COLOR = cfg.themeColor;
export const CONTACT_EMAIL = cfg.contactEmail;
