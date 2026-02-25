import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createServerClient } from "../src/lib/supabase";

const INITIAL_CATEGORIES = [
  {
    name: "Field Service Management",
    g2_category_url: "https://www.g2.com/categories/field-service-management",
    subreddits: ["HVAC", "Plumbing", "Electricians", "smallbusiness", "msp"],
    hn_search_terms: ["ServiceTitan", "Housecall Pro", "Jobber", "field service software"],
    priority: 9,
  },
  {
    name: "CRM",
    g2_category_url: "https://www.g2.com/categories/crm",
    subreddits: ["sales", "salesforce", "smallbusiness", "Entrepreneur"],
    hn_search_terms: ["CRM software", "Salesforce alternative", "HubSpot"],
    priority: 8,
  },
  {
    name: "Accounting Software",
    g2_category_url: "https://www.g2.com/categories/accounting",
    subreddits: ["Accounting", "Bookkeeping", "smallbusiness", "QuickBooks"],
    hn_search_terms: ["QuickBooks", "Xero", "accounting software"],
    priority: 8,
  },
  {
    name: "Project Management",
    g2_category_url: "https://www.g2.com/categories/project-management",
    subreddits: ["projectmanagement", "asana", "ClickUp", "mondaydotcom"],
    hn_search_terms: ["project management tool", "Asana", "Monday.com", "ClickUp"],
    priority: 7,
  },
  {
    name: "POS / Retail",
    g2_category_url: "https://www.g2.com/categories/retail-pos",
    subreddits: ["retailtech", "smallbusiness", "restaurateur", "Restaurant"],
    hn_search_terms: ["POS system", "Toast POS", "Square", "retail software"],
    priority: 8,
  },
  {
    name: "Email Marketing",
    g2_category_url: "https://www.g2.com/categories/email-marketing",
    subreddits: ["emailmarketing", "Emailmarketing", "marketing", "Entrepreneur"],
    hn_search_terms: ["Mailchimp", "email marketing", "newsletter tool"],
    priority: 6,
  },
  {
    name: "Help Desk / Support",
    g2_category_url: "https://www.g2.com/categories/help-desk",
    subreddits: ["sysadmin", "msp", "ITManagers", "CustomerSuccess"],
    hn_search_terms: ["help desk software", "Zendesk", "Freshdesk", "ticketing system"],
    priority: 7,
  },
  {
    name: "HR & Payroll",
    g2_category_url: "https://www.g2.com/categories/payroll",
    subreddits: ["humanresources", "payroll", "smallbusiness"],
    hn_search_terms: ["payroll software", "Gusto", "ADP", "HR software"],
    priority: 7,
  },
  {
    name: "Inventory Management",
    g2_category_url: "https://www.g2.com/categories/inventory-management",
    subreddits: ["ecommerce", "smallbusiness", "Etsy", "shopify"],
    hn_search_terms: ["inventory management", "Cin7", "inFlow", "inventory software"],
    priority: 8,
  },
  {
    name: "LMS / Course Platforms",
    g2_category_url: "https://www.g2.com/categories/learning-management-system-lms",
    subreddits: ["onlinecourses", "Teachable", "CourseCreation", "Entrepreneur"],
    hn_search_terms: ["Teachable", "Kajabi", "Thinkific", "course platform", "LMS"],
    priority: 7,
  },
  {
    name: "Restaurant Management",
    g2_category_url: "https://www.g2.com/categories/restaurant-management",
    subreddits: ["restaurateur", "Restaurant", "KitchenConfidential", "Chefit"],
    hn_search_terms: ["Toast restaurant", "restaurant POS", "restaurant management software"],
    priority: 7,
  },
  {
    name: "Property Management",
    g2_category_url: "https://www.g2.com/categories/property-management",
    subreddits: ["Landlord", "PropertyManagement", "realestateinvesting"],
    hn_search_terms: ["property management software", "Buildium", "AppFolio", "landlord software"],
    priority: 7,
  },
  {
    name: "Client Communication / Messaging",
    g2_category_url: "https://www.g2.com/categories/business-text-messaging",
    subreddits: ["smallbusiness", "dentistry", "optometry"],
    hn_search_terms: ["Podium", "Birdeye", "business messaging", "review management"],
    priority: 8,
  },
  {
    name: "Practice Management (Healthcare)",
    g2_category_url: "https://www.g2.com/categories/practice-management",
    subreddits: ["therapists", "psychotherapy", "Chiropractic", "dentistry"],
    hn_search_terms: ["SimplePractice", "TherapyNotes", "practice management software"],
    priority: 7,
  },
  {
    name: "Scheduling & Booking",
    g2_category_url: "https://www.g2.com/categories/appointment-scheduling",
    subreddits: ["smallbusiness", "Entrepreneur", "freelance"],
    hn_search_terms: ["Calendly", "Acuity", "scheduling software", "booking tool"],
    priority: 6,
  },
];

async function seed() {
  const supabase = createServerClient();

  console.log("Seeding monitored categories...");

  for (const cat of INITIAL_CATEGORIES) {
    const { error } = await supabase.from("monitored_categories").upsert(
      {
        name: cat.name,
        g2_category_url: cat.g2_category_url,
        subreddits: cat.subreddits,
        hn_search_terms: cat.hn_search_terms,
        priority: cat.priority,
        is_active: true,
      },
      { onConflict: "name" }
    );

    if (error) {
      console.error(`Failed to seed "${cat.name}":`, error.message);
    } else {
      console.log(`  Seeded: ${cat.name}`);
    }
  }

  console.log("Done!");
}

seed();
