// ============================================
// Product Search Configuration
// 5-layer defense against false positives
// ============================================

export type AmbiguityTier = "safe" | "risky" | "dangerous";

export interface ProductSearchConfig {
  canonical_name: string;
  ambiguity_tier: AmbiguityTier;
  context_anchors: string[];
  exclusion_terms: string[];
  unambiguous_forms: string[];
  category: string;
  description: string;
}

// Software/SaaS indicator words — used for RISKY and DANGEROUS tier validation
export const SOFTWARE_INDICATORS = [
  "software", "app", "platform", "saas", "tool", "pricing",
  "subscription", "feature", "integration", "api", "dashboard",
  "login", "account", "support ticket", "customer support",
  "update", "bug", "crash", "ui", "ux", "onboarding",
  "alternative to", "switched from", "switched to", "migrated",
  "competitor", "vs", "compared to", "pricing plan", "free tier",
  "enterprise", "per user", "per seat", "monthly", "annual plan",
  "crm", "erp", "pos", "invoice", "workflow", "automation",
];

export const PRODUCT_CONFIGS: ProductSearchConfig[] = [
  // === SAFE TIER ===
  {
    canonical_name: "ServiceTitan",
    ambiguity_tier: "safe",
    context_anchors: [],
    exclusion_terms: [],
    unambiguous_forms: ["ServiceTitan"],
    category: "Field Service Management",
    description: "Field service management software for HVAC, plumbing, electrical contractors",
  },
  {
    canonical_name: "QuickBooks",
    ambiguity_tier: "safe",
    context_anchors: [],
    exclusion_terms: [],
    unambiguous_forms: ["QuickBooks", "QuickBooks Online", "QBO"],
    category: "Accounting",
    description: "Small business accounting software by Intuit",
  },
  {
    canonical_name: "Salesforce",
    ambiguity_tier: "safe",
    context_anchors: [],
    exclusion_terms: [],
    unambiguous_forms: ["Salesforce", "SFDC"],
    category: "CRM",
    description: "Enterprise CRM platform",
  },
  {
    canonical_name: "HubSpot",
    ambiguity_tier: "safe",
    context_anchors: [],
    exclusion_terms: [],
    unambiguous_forms: ["HubSpot"],
    category: "CRM / Marketing",
    description: "Inbound marketing, sales, and CRM platform",
  },
  {
    canonical_name: "Zendesk",
    ambiguity_tier: "safe",
    context_anchors: [],
    exclusion_terms: [],
    unambiguous_forms: ["Zendesk"],
    category: "Help Desk",
    description: "Customer service and support ticketing platform",
  },
  {
    canonical_name: "ClickUp",
    ambiguity_tier: "safe",
    context_anchors: [],
    exclusion_terms: [],
    unambiguous_forms: ["ClickUp"],
    category: "Project Management",
    description: "Project management and productivity platform",
  },
  {
    canonical_name: "Jobber",
    ambiguity_tier: "safe",
    context_anchors: [],
    exclusion_terms: ["steve jobber", "jobber supply"],
    unambiguous_forms: ["Jobber", "Jobber app"],
    category: "Field Service Management",
    description: "Field service management for home service businesses",
  },
  {
    canonical_name: "Housecall Pro",
    ambiguity_tier: "safe",
    context_anchors: [],
    exclusion_terms: [],
    unambiguous_forms: ["Housecall Pro", "HousecallPro"],
    category: "Field Service Management",
    description: "Home service business management software",
  },
  {
    canonical_name: "Freshdesk",
    ambiguity_tier: "safe",
    context_anchors: [],
    exclusion_terms: [],
    unambiguous_forms: ["Freshdesk", "Freshworks"],
    category: "Help Desk",
    description: "Customer support and ticketing software by Freshworks",
  },

  // === RISKY TIER ===
  {
    canonical_name: "Asana",
    ambiguity_tier: "risky",
    context_anchors: ["project", "task", "team", "workspace", "board"],
    exclusion_terms: ["yoga", "pose", "asana practice", "meditation"],
    unambiguous_forms: ["Asana app", "Asana project management"],
    category: "Project Management",
    description: "Project and task management software",
  },
  {
    canonical_name: "Xero",
    ambiguity_tier: "risky",
    context_anchors: ["accounting", "invoice", "bookkeeping", "payroll", "gst", "bas", "tax"],
    exclusion_terms: ["xero tolerance", "from xero", "ground xero"],
    unambiguous_forms: ["Xero accounting", "Xero app"],
    category: "Accounting",
    description: "Cloud accounting software for small businesses",
  },
  {
    canonical_name: "Slack",
    ambiguity_tier: "risky",
    context_anchors: ["channel", "workspace", "message", "thread", "notification"],
    exclusion_terms: ["slack off", "pick up the slack", "slack jaw", "slack line", "cut some slack"],
    unambiguous_forms: ["Slack app", "Slack messaging"],
    category: "Team Communication",
    description: "Business messaging and collaboration platform",
  },
  {
    canonical_name: "Stripe",
    ambiguity_tier: "risky",
    context_anchors: ["payment", "checkout", "billing", "api", "subscription", "merchant"],
    exclusion_terms: ["racing stripe", "stripe pattern", "pinstripe", "stars and stripes"],
    unambiguous_forms: ["Stripe payments", "Stripe API"],
    category: "Payments",
    description: "Online payment processing platform for developers",
  },
  {
    canonical_name: "Notion",
    ambiguity_tier: "risky",
    context_anchors: ["workspace", "page", "database", "template", "wiki"],
    exclusion_terms: ["preconceived notion", "the notion that", "romantic notion", "notion of"],
    unambiguous_forms: ["Notion app", "Notion.so"],
    category: "Productivity",
    description: "All-in-one workspace for notes, docs, and project management",
  },
  {
    canonical_name: "Jira",
    ambiguity_tier: "risky",
    context_anchors: ["ticket", "sprint", "backlog", "board", "issue", "agile", "atlassian"],
    exclusion_terms: [],
    unambiguous_forms: ["Jira", "Jira Software"],
    category: "Project Management",
    description: "Issue tracking and project management by Atlassian",
  },

  // === DANGEROUS TIER ===
  {
    canonical_name: "Square",
    ambiguity_tier: "dangerous",
    context_anchors: ["pos", "payment", "merchant", "reader", "terminal", "checkout", "seller", "register", "card reader", "point of sale", "processing fee"],
    exclusion_terms: ["square feet", "square meter", "town square", "square root", "square dance", "times square", "square meal", "fair and square", "square off", "back to square", "public square", "square one", "square up to"],
    unambiguous_forms: ["Square POS", "Square Payments", "Square Register", "squareup", "Square Reader"],
    category: "POS / Payments",
    description: "POS and payment processing platform for small businesses",
  },
  {
    canonical_name: "Toast",
    ambiguity_tier: "dangerous",
    context_anchors: ["pos", "restaurant", "menu", "order", "kitchen", "server", "tab", "table management", "online ordering"],
    exclusion_terms: ["toast bread", "french toast", "avocado toast", "burnt toast", "toast of the town", "champagne toast", "wedding toast", "raise a toast", "piece of toast"],
    unambiguous_forms: ["Toast POS", "Toast restaurant", "Toast tab", "toasttab"],
    category: "Restaurant POS",
    description: "Restaurant management and POS platform",
  },
  {
    canonical_name: "Drift",
    ambiguity_tier: "dangerous",
    context_anchors: ["chatbot", "conversational", "live chat", "lead", "bot", "sales chat", "website chat"],
    exclusion_terms: ["drift away", "drift off", "tokyo drift", "continental drift", "driftwood", "drift car", "snow drift"],
    unambiguous_forms: ["Drift chatbot", "Drift.com", "Drift conversational"],
    category: "Conversational Marketing",
    description: "Conversational marketing and sales platform",
  },
  {
    canonical_name: "Harvest",
    ambiguity_tier: "dangerous",
    context_anchors: ["time tracking", "timesheet", "invoice", "hours", "billable", "timer", "project time"],
    exclusion_terms: ["harvest season", "harvest moon", "harvest festival", "crop harvest", "bountiful harvest", "harvest time"],
    unambiguous_forms: ["Harvest time tracking", "Harvest app", "getharvest"],
    category: "Time Tracking",
    description: "Time tracking and invoicing for small businesses",
  },
  {
    canonical_name: "Monday",
    ambiguity_tier: "dangerous",
    context_anchors: [".com", "board", "workspace", "project management", "workflow", "automation", "crm"],
    exclusion_terms: ["monday morning", "next monday", "last monday", "happy monday", "monday night", "cyber monday", "monday to friday", "on monday", "every monday", "this monday"],
    unambiguous_forms: ["Monday.com", "monday.com"],
    category: "Project Management",
    description: "Work management platform",
  },
  {
    canonical_name: "inFlow",
    ambiguity_tier: "dangerous",
    context_anchors: ["inventory", "stock", "warehouse", "barcode", "sku", "purchase order", "fifo"],
    exclusion_terms: ["capital inflow", "cash inflow", "inflow of", "inflow and outflow", "water inflow", "tourist inflow", "migration inflow", "foreign inflow"],
    unambiguous_forms: ["inFlow Inventory", "inFlow software"],
    category: "Inventory Management",
    description: "Inventory management software for small businesses",
  },
  {
    canonical_name: "Rippling",
    ambiguity_tier: "dangerous",
    context_anchors: ["hr", "payroll", "employee", "onboarding", "benefits", "it management"],
    exclusion_terms: ["rippling effect", "rippling water", "rippling muscles", "rippling through"],
    unambiguous_forms: ["Rippling HR", "Rippling payroll"],
    category: "HR / Payroll",
    description: "HR, IT, and finance platform for businesses",
  },
];

// Build lookup maps for fast access
const configByName = new Map<string, ProductSearchConfig>();
for (const config of PRODUCT_CONFIGS) {
  configByName.set(config.canonical_name.toLowerCase(), config);
}

export function getProductConfig(productName: string): ProductSearchConfig | undefined {
  return configByName.get(productName.toLowerCase());
}

export function getAllProductConfigs(): ProductSearchConfig[] {
  return PRODUCT_CONFIGS;
}

// ============================================
// Layer 3: Pre-AI Text Validation (rule-based, zero cost)
// ============================================

export function validateProductMention(
  text: string,
  config: ProductSearchConfig
): { valid: boolean; reason?: string } {
  const lowerText = text.toLowerCase();

  // Check exclusion terms — instant disqualify
  for (const term of config.exclusion_terms) {
    if (lowerText.includes(term.toLowerCase())) {
      return { valid: false, reason: `exclusion term: "${term}"` };
    }
  }

  // SAFE tier: just check the name appears (case-insensitive)
  if (config.ambiguity_tier === "safe") {
    if (lowerText.includes(config.canonical_name.toLowerCase())) {
      return { valid: true };
    }
    return { valid: false, reason: "product name not found in text" };
  }

  // RISKY tier: name must appear + text must contain a software indicator
  // OR a context anchor
  if (config.ambiguity_tier === "risky") {
    const hasSoftwareIndicator = SOFTWARE_INDICATORS.some(
      (ind) => lowerText.includes(ind)
    );
    const hasContextAnchor = config.context_anchors.some(
      (anchor) => lowerText.includes(anchor.toLowerCase())
    );
    if (hasSoftwareIndicator || hasContextAnchor) {
      return { valid: true };
    }
    return { valid: false, reason: "no software indicator or context anchor found" };
  }

  // DANGEROUS tier: must have EITHER a context anchor OR a software indicator
  if (config.ambiguity_tier === "dangerous") {
    const hasContextAnchor = config.context_anchors.some(
      (anchor) => lowerText.includes(anchor.toLowerCase())
    );
    const hasSoftwareIndicator = SOFTWARE_INDICATORS.some(
      (ind) => lowerText.includes(ind)
    );
    if (hasContextAnchor || hasSoftwareIndicator) {
      return { valid: true };
    }
    return { valid: false, reason: "dangerous name with no context anchor or software indicator" };
  }

  return { valid: true };
}

// ============================================
// Layer 5: Post-Extraction Sanity Checks (rule-based, zero cost)
// ============================================

export function postExtractionValidation(extracted: {
  severity?: number;
  pain_categories?: string[];
  wishes?: string | null;
  specific_feature_gaps?: string[];
  competitor_mentions?: string[];
  switching_intent?: string;
}): { valid: boolean; reason?: string } {
  // Reject if severity is below threshold
  if ((extracted.severity || 0) < 3) {
    return { valid: false, reason: "severity too low (<3)" };
  }

  // Reject if no pain categories were identified
  if (!extracted.pain_categories || extracted.pain_categories.length === 0) {
    return { valid: false, reason: "no pain categories" };
  }

  // Reject if all fields are suspiciously empty — AI couldn't find real pain
  const hasSubstance =
    extracted.wishes ||
    (extracted.specific_feature_gaps && extracted.specific_feature_gaps.length > 0) ||
    (extracted.competitor_mentions && extracted.competitor_mentions.length > 0) ||
    (extracted.switching_intent && extracted.switching_intent !== "none");

  if (!hasSubstance && (extracted.severity || 0) < 7) {
    return { valid: false, reason: "no substance and low severity" };
  }

  return { valid: true };
}
