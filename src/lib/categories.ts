import { PainCategory } from "./types";

export interface CategoryDef {
  label: string;
  icon: string;
  color: string;
  keywords: string[];
}

export const PAIN_CATEGORIES: Record<PainCategory, CategoryDef> = {
  pricing: {
    label: "Pricing & Value",
    icon: "DollarSign",
    color: "#EF4444",
    keywords: [
      "expensive", "overpriced", "cost", "price increase", "not worth",
      "cheaper alternative", "per user", "per seat", "hidden fees",
      "price hike", "too much money", "robbery", "ripoff",
    ],
  },
  ux: {
    label: "UX & Usability",
    icon: "Layout",
    color: "#F59E0B",
    keywords: [
      "clunky", "unintuitive", "confusing", "hard to use", "too many clicks",
      "complicated", "outdated UI", "ugly interface", "learning curve",
      "not user friendly", "terrible design", "looks like 2005",
    ],
  },
  support: {
    label: "Customer Support",
    icon: "Headphones",
    color: "#8B5CF6",
    keywords: [
      "support", "customer service", "no response", "unhelpful", "long wait",
      "terrible support", "can't reach", "ignored", "ticket", "hold time",
      "outsourced", "script readers",
    ],
  },
  reliability: {
    label: "Reliability & Bugs",
    icon: "AlertTriangle",
    color: "#DC2626",
    keywords: [
      "buggy", "crashes", "downtime", "slow", "breaks", "glitch", "error",
      "freezes", "unreliable", "data loss", "outage", "laggy",
    ],
  },
  features: {
    label: "Missing Features",
    icon: "PuzzlePiece",
    color: "#3B82F6",
    keywords: [
      "missing feature", "wish it had", "no integration", "can't do",
      "limited", "basic", "lacks", "need", "would be nice if", "why can't",
      "feature request",
    ],
  },
  onboarding: {
    label: "Onboarding & Setup",
    icon: "Rocket",
    color: "#10B981",
    keywords: [
      "setup", "onboarding", "implementation", "takes weeks", "consultant",
      "difficult to configure", "learning curve", "documentation",
      "getting started",
    ],
  },
  mobile: {
    label: "Mobile Experience",
    icon: "Smartphone",
    color: "#06B6D4",
    keywords: [
      "mobile app", "phone", "offline", "field", "tablet", "responsive",
      "mobile version", "app crashes", "no mobile",
    ],
  },
  contracts: {
    label: "Contracts & Lock-in",
    icon: "Lock",
    color: "#DC2626",
    keywords: [
      "contract", "locked in", "annual", "cancel", "auto-renew", "trapped",
      "can't leave", "data export", "hostage", "migration",
    ],
  },
  integrations: {
    label: "Integrations",
    icon: "Link",
    color: "#7C3AED",
    keywords: [
      "integration", "API", "connect", "sync", "webhook", "zapier",
      "doesn't work with", "compatibility", "import", "export",
    ],
  },
  scaling: {
    label: "Scaling & Performance",
    icon: "TrendingUp",
    color: "#F97316",
    keywords: [
      "scale", "grow", "enterprise", "large team", "performance", "limits",
      "throttle", "capacity", "slow with large",
    ],
  },
};
