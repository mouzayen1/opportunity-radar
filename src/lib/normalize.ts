import { createServerClient } from "./supabase";
import slugify from "slugify";

const PRODUCT_ALIASES: Record<string, string[]> = {
  servicetitan: ["service titan", "service-titan"],
  quickbooks: ["quick books", "qbo", "quickbooks online", "qb online", "intuit quickbooks"],
  hubspot: ["hub spot", "hubspot crm"],
  salesforce: ["sfdc", "sales force", "salesforce crm"],
  servicenow: ["service now", "service-now"],
  freshdesk: ["fresh desk"],
  zoho: ["zoho crm", "zoho one", "zoho books"],
  netsuite: ["net suite", "oracle netsuite"],
  lightspeed: ["lightspeed pos", "lightspeed retail"],
  toast: ["toast pos", "toast tab", "toasttab"],
  monday: ["monday.com", "mondaycom", "monday com"],
  asana: ["asana project"],
  clickup: ["click up", "click-up"],
  zendesk: ["zen desk"],
  intercom: ["inter com"],
  mailchimp: ["mail chimp"],
  calendly: ["calendly scheduling"],
  gusto: ["gusto payroll"],
  adp: ["adp payroll", "adp workforce"],
};

export function normalizeProductName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");

  for (const [canonical, aliases] of Object.entries(PRODUCT_ALIASES)) {
    if (aliases.includes(cleaned) || cleaned === canonical) {
      return canonical;
    }
  }

  return cleaned.replace(/\s/g, "");
}

export function makeSlug(name: string): string {
  return slugify(name, { lower: true, strict: true });
}

export async function findOrCreateProduct(
  productName: string,
  category?: string
): Promise<{ id: string; slug: string }> {
  const supabase = createServerClient();
  const normalized = normalizeProductName(productName);

  // Try to find existing
  const { data: existing } = await supabase
    .from("products")
    .select("id, slug")
    .eq("normalized_name", normalized)
    .single();

  if (existing) return existing;

  // Create new
  const slug = makeSlug(productName);
  const { data: created, error } = await supabase
    .from("products")
    .insert({
      name: productName,
      slug,
      normalized_name: normalized,
      category: category || "Uncategorized",
    })
    .select("id, slug")
    .single();

  if (error) throw new Error(`Failed to create product: ${error.message}`);
  return created!;
}
