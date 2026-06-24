import type { CSSProperties } from "react";

export type AreaColor =
  | "health"
  | "career"
  | "spirit"
  | "social"
  | "learning"
  | "creative";

export const AREA_COLORS: AreaColor[] = [
  "health",
  "career",
  "spirit",
  "social",
  "learning",
  "creative",
];

export const AREA_PRESETS: { name: string; color: AreaColor }[] = [
  { name: "Health", color: "health" },
  { name: "Career", color: "career" },
  { name: "Mind", color: "spirit" },
  { name: "Social", color: "social" },
  { name: "Learning", color: "learning" },
  { name: "Creative", color: "creative" },
];

export interface AreaTokens {
  cssVar: string;
  bg: string;
  bgSoft: string;
  bgFaint: string;
  text: string;
  border: string;
  ring: string;
  ringSolid: string;
  ringHover: string;
  hoverCardRing: string;
  hoverCardBg: string;
  navItemHover: string;
  navItemActive: string;
}

export const areaTokens: Record<AreaColor, AreaTokens> = {
  health: {
    cssVar: "var(--area-health)",
    bg: "bg-area-health",
    bgSoft: "bg-area-health/10",
    bgFaint: "bg-area-health/5",
    text: "text-area-health",
    border: "border-area-health",
    ring: "ring-area-health/30",
    ringSolid: "ring-area-health",
    ringHover: "group-hover:ring-area-health/40",
    hoverCardRing: "hover:ring-2 hover:ring-area-health/50",
    hoverCardBg: "hover:bg-area-health/5",
    navItemHover: "hover:bg-area-health/10 hover:text-area-health",
    navItemActive: "bg-area-health/10 text-area-health",
  },
  career: {
    cssVar: "var(--area-career)",
    bg: "bg-area-career",
    bgSoft: "bg-area-career/10",
    bgFaint: "bg-area-career/5",
    text: "text-area-career",
    border: "border-area-career",
    ring: "ring-area-career/30",
    ringSolid: "ring-area-career",
    ringHover: "group-hover:ring-area-career/40",
    hoverCardRing: "hover:ring-2 hover:ring-area-career/50",
    hoverCardBg: "hover:bg-area-career/5",
    navItemHover: "hover:bg-area-career/10 hover:text-area-career",
    navItemActive: "bg-area-career/10 text-area-career",
  },
  spirit: {
    cssVar: "var(--area-spirit)",
    bg: "bg-area-spirit",
    bgSoft: "bg-area-spirit/10",
    bgFaint: "bg-area-spirit/5",
    text: "text-area-spirit",
    border: "border-area-spirit",
    ring: "ring-area-spirit/30",
    ringSolid: "ring-area-spirit",
    ringHover: "group-hover:ring-area-spirit/40",
    hoverCardRing: "hover:ring-2 hover:ring-area-spirit/50",
    hoverCardBg: "hover:bg-area-spirit/5",
    navItemHover: "hover:bg-area-spirit/10 hover:text-area-spirit",
    navItemActive: "bg-area-spirit/10 text-area-spirit",
  },
  social: {
    cssVar: "var(--area-social)",
    bg: "bg-area-social",
    bgSoft: "bg-area-social/10",
    bgFaint: "bg-area-social/5",
    text: "text-area-social",
    border: "border-area-social",
    ring: "ring-area-social/30",
    ringSolid: "ring-area-social",
    ringHover: "group-hover:ring-area-social/40",
    hoverCardRing: "hover:ring-2 hover:ring-area-social/50",
    hoverCardBg: "hover:bg-area-social/5",
    navItemHover: "hover:bg-area-social/10 hover:text-area-social",
    navItemActive: "bg-area-social/10 text-area-social",
  },
  learning: {
    cssVar: "var(--area-learning)",
    bg: "bg-area-learning",
    bgSoft: "bg-area-learning/10",
    bgFaint: "bg-area-learning/5",
    text: "text-area-learning",
    border: "border-area-learning",
    ring: "ring-area-learning/30",
    ringSolid: "ring-area-learning",
    ringHover: "group-hover:ring-area-learning/40",
    hoverCardRing: "hover:ring-2 hover:ring-area-learning/50",
    hoverCardBg: "hover:bg-area-learning/5",
    navItemHover: "hover:bg-area-learning/10 hover:text-area-learning",
    navItemActive: "bg-area-learning/10 text-area-learning",
  },
  creative: {
    cssVar: "var(--area-creative)",
    bg: "bg-area-creative",
    bgSoft: "bg-area-creative/10",
    bgFaint: "bg-area-creative/5",
    text: "text-area-creative",
    border: "border-area-creative",
    ring: "ring-area-creative/30",
    ringSolid: "ring-area-creative",
    ringHover: "group-hover:ring-area-creative/40",
    hoverCardRing: "hover:ring-2 hover:ring-area-creative/50",
    hoverCardBg: "hover:bg-area-creative/5",
    navItemHover: "hover:bg-area-creative/10 hover:text-area-creative",
    navItemActive: "bg-area-creative/10 text-area-creative",
  },
};

/** @deprecated Use areaTokens instead */
export const AREA_COLOR_MAP: Record<
  AreaColor,
  { bg: string; bgSoft: string; text: string; ring: string; raw: string }
> = {
  health: {
    bg: areaTokens.health.bg,
    bgSoft: areaTokens.health.bgSoft,
    text: areaTokens.health.text,
    ring: areaTokens.health.ring,
    raw: areaTokens.health.cssVar,
  },
  career: {
    bg: areaTokens.career.bg,
    bgSoft: areaTokens.career.bgSoft,
    text: areaTokens.career.text,
    ring: areaTokens.career.ring,
    raw: areaTokens.career.cssVar,
  },
  spirit: {
    bg: areaTokens.spirit.bg,
    bgSoft: areaTokens.spirit.bgSoft,
    text: areaTokens.spirit.text,
    ring: areaTokens.spirit.ring,
    raw: areaTokens.spirit.cssVar,
  },
  social: {
    bg: areaTokens.social.bg,
    bgSoft: areaTokens.social.bgSoft,
    text: areaTokens.social.text,
    ring: areaTokens.social.ring,
    raw: areaTokens.social.cssVar,
  },
  learning: {
    bg: areaTokens.learning.bg,
    bgSoft: areaTokens.learning.bgSoft,
    text: areaTokens.learning.text,
    ring: areaTokens.learning.ring,
    raw: areaTokens.learning.cssVar,
  },
  creative: {
    bg: areaTokens.creative.bg,
    bgSoft: areaTokens.creative.bgSoft,
    text: areaTokens.creative.text,
    ring: areaTokens.creative.ring,
    raw: areaTokens.creative.cssVar,
  },
};

export function areaStyle(color: AreaColor): CSSProperties {
  return { backgroundColor: areaTokens[color].cssVar };
}

export function areaMix(color: AreaColor, pct: number): string {
  return `color-mix(in oklch, ${areaTokens[color].cssVar} ${pct}%, transparent)`;
}
