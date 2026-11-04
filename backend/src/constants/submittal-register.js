// Lists from the "LISTS" tab of Shop Drawing Log.xlsx.

export const DEFAULT_REVIEW_DAYS = 14;

export const REVIEWERS = [
  "Architect",
  "Structural Engineer",
  "MEP Engineer",
  "Fire Protection Engineer",
  "Fire Alarm Engineer",
  "Smoke Control Engineer",
  "Civil Engineer",
  "Landscape Architect",
  "Geotechnical Engineer",
  "Threshold Inspector",
  "Low Voltage Consultant",
  "Kitchen Consultant",
  "Pool Engineer",
  "Owner"
];

export const ACTION_CODES = ["Approved", "Approved as Noted", "Revise & Resubmit", "Rejected", "For Record Only"];
export const ACTION_CODES_SET = new Set(ACTION_CODES);

// These close the submittal with the design team.
export const CLOSING_ACTION_CODES = new Set(["Approved", "Approved as Noted", "For Record Only"]);

export const DISCIPLINES = [
  "General",
  "Architectural",
  "Structural",
  "Civil",
  "Mechanical",
  "Electrical",
  "Photometric",
  "Plumbing",
  "Fire Protection",
  "Fire Alarm",
  "Low Voltage",
  "Landscape & Irrigation",
  "Pools & Marine"
];

export const SUBMITTAL_TYPES = [
  "Shop Drawings",
  "Product Data",
  "Samples",
  "Calculations",
  "Product Approval (NOA/FL#)",
  "Mix Design",
  "Test Report",
  "Plan / Procedure",
  "Survey",
  "Mock-up",
  "Closeout / O&M"
];

// Trades from the project contacts sheet. Demolition, drywall & ceilings, finishes, test & balance,
// paving & striping and testing lab were removed on request.
export const TRADES = [
  "Concrete / foundations",
  "Piles",
  "Precast",
  "Masonry",
  "Structural & misc. steel",
  "Railings & glass guards",
  "Millwork",
  "Waterproofing & traffic coatings",
  "Roofing",
  "Composite metal panels",
  "Window wall / storefront",
  "Doors, frames & hardware",
  "Coiling doors & smoke curtains",
  "Specialties & signage",
  "Elevators",
  "Fire sprinkler / standpipe / fire pump",
  "Plumbing",
  "HVAC",
  "Controls / BAS",
  "Electrical",
  "Generator",
  "Fire alarm",
  "ERRCS / BDA",
  "Low voltage / security",
  "Sitework / civil",
  "Landscape",
  "Irrigation",
  "Surveyor"
];

export const BALL = {
  SUBCONTRACTOR: "Subcontractor",
  GC: "GC",
  REVIEWER: "Reviewer",
  CLOSED: "Closed",
  SUPERSEDED: "Superseded"
};

export const ALERTS = {
  REVIEW_OVERDUE: "REVIEW OVERDUE",
  ENTER_ACTION_CODE: "ENTER ACTION CODE",
  ENTER_REVIEWER: "ENTER REVIEWER",
  SEND_TO_AHJ: "SEND TO AHJ",
  AT_AHJ_PENDING: "AT AHJ — PENDING",
  NEEDED_ON_SITE: "NEEDED ON SITE — NOT APPROVED",
  LATE_TO_SUBMIT: "LATE TO SUBMIT"
};

// Project contacts sheet: one row per role (design team) or trade (GC and subcontractors).
export const CONTACT_CATEGORIES = {
  design_team: { title: "Design team / reviewers", roles: REVIEWERS },
  contractors: { title: "General contractor and subcontractors", roles: ["General Contractor", ...TRADES] }
};

export const DEFAULT_CONTACT_COMPANIES = { contractors: { "General Contractor": "MG3 Developer Group, LLC" } };
