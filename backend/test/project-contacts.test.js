import assert from "node:assert/strict";
import test from "node:test";

import { CONTACT_CATEGORIES } from "../src/constants/submittal-register.js";
import { buildContactSheet } from "../src/routes/project-contacts.routes.js";

const ROLES = Object.fromEntries(Object.entries(CONTACT_CATEGORIES).map(([key, { roles }]) => [key, roles]));

test("every listed role shows even with nothing stored, GC defaults to MG3", () => {
  const [design, contractors] = buildContactSheet([], ROLES);
  assert.equal(design.key, "design_team");
  assert.equal(design.rows[0].role, "Architect");
  assert.equal(design.rows[0].id, null);
  assert.equal(contractors.rows[0].role, "General Contractor");
  assert.equal(contractors.rows[0].company, "MG3 Developer Group, LLC");
  assert.ok(!contractors.rows.some((row) => row.role === "Demolition"));
});

test("stored rows fill their role and unlisted roles come last as custom rows", () => {
  const stored = [
    { id: "7", category: "design_team", role: "Architect", company: "ACME", contact: "Ana", email: "a@x.com", phone: "1", notes: "" },
    { id: "8", category: "contractors", role: "Demolition", company: "Wreck Co", contact: "", email: "", phone: "", notes: "" }
  ];
  const [design, contractors] = buildContactSheet(stored, ROLES);
  assert.deepEqual(design.rows[0], { id: 7, role: "Architect", company: "ACME", contact: "Ana", email: "a@x.com", phone: "1", notes: "", custom: false });
  const last = contractors.rows.at(-1);
  assert.equal(last.role, "Demolition");
  assert.equal(last.custom, true);
});

test("a project's AOR and EOR fields become design team rows", async () => {
  const { designTeamFromProjectFields } = await import("../src/db/contacts-schema.js");
  assert.deepEqual(designTeamFromProjectFields("ACME Architects", "Civil EOR: Kimley | Structural Engineer: DDA | broken"), [
    { role: "Architect", company: "ACME Architects" },
    { role: "Civil Engineer", company: "Kimley" },
    { role: "Structural Engineer", company: "DDA" }
  ]);
  assert.deepEqual(designTeamFromProjectFields(null, ""), []);
});
