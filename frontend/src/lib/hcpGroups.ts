// Frontend mirror of backend/src/utils/hcpGroups.js — keep both in sync.
// Same flight-bucketing convention used for AI predictions, reused here for
// the live tournament leaderboard so there's one consistent scheme app-wide.

export type Gender = "man" | "woman";

export function getHcpGroup(hcp: number, gender: Gender = "man"): string {
  if (gender === "woman") {
    return hcp <= 24 ? "Woman A HCP по 24" : "Woman B HCP 24,1-36";
  }
  if (hcp <= 13.5) return "Man A HCP по 13,5";
  if (hcp <= 22) return "Man B HCP 13,6-22";
  return "Man C HCP 22,1-36";
}

// Display order for flight cards
export const HCP_GROUP_ORDER = [
  "Man A HCP по 13,5",
  "Man B HCP 13,6-22",
  "Man C HCP 22,1-36",
  "Woman A HCP по 24",
  "Woman B HCP 24,1-36",
];

// Simple heuristic fallback for players who haven't set gender in their profile yet
export function detectGender(name: string): Gender {
  const femaleEndings = ["ва", "на", "ая", "ья", "ина", "ова", "ева", "ская"];
  const normalized = name.toLowerCase().trim();
  return femaleEndings.some((e) => normalized.endsWith(e)) ? "woman" : "man";
}
