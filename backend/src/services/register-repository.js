import pool from "../db/pool.js";
import { computeRegisterItem, todayIso } from "./register-status.js";

// Dates are cast to text so they reach the client as plain "YYYY-MM-DD" values, and BIGINT ids to int
// because pg returns BIGINT as a string.
const ITEM_SELECT = `
  SELECT r.id::int AS id, r.project_id, r.master_item_id::int AS master_item_id, r.submittal_no, r.spec_section, r.description, r.discipline,
         r.submittal_type, r.reviewer, r.ahj, r.signed_sealed, r.long_lead, r.inspection_related, r.notes,
         r.in_use, r.subcontractor, r.lead_time_weeks, r.needed_on_site::text, r.sent_to_ahj::text,
         r.ahj_approved::text, p.project_name, p.review_days
  FROM project_register_items r
  JOIN product_list p ON p.project_id = r.project_id
`;

export const LOG_SELECT = `
  SELECT l.id::int AS id, l.register_item_id::int AS register_item_id, l.rev, l.received_from_sub::text, l.sent_to, l.date_sent::text,
         l.returned_by_reviewer::text, l.action_code, l.returned_to_sub::text, l.gc_transmittal_no, l.comments
  FROM submittal_log_entries l
`;

/**
 * Load register items with their log entries and calculated columns.
 * Filters: projectId, itemIds, inUseOnly.
 */
export const loadComputedItems = async ({ projectId = null, itemIds = null, inUseOnly = false } = {}, db = pool) => {
  const { rows: items } = await db.query(
    `${ITEM_SELECT}
     WHERE ($1::varchar IS NULL OR r.project_id = $1)
       AND ($2::bigint[] IS NULL OR r.id = ANY($2::bigint[]))
       AND (NOT $3 OR r.in_use)
     ORDER BY r.project_id, r.submittal_no`,
    [projectId, itemIds, inUseOnly]
  );
  if (!items.length) return [];

  const { rows: entries } = await db.query(`${LOG_SELECT} WHERE l.register_item_id = ANY($1::bigint[])`, [
    items.map((item) => item.id)
  ]);
  const entriesByItem = new Map();
  for (const entry of entries) {
    const key = String(entry.register_item_id);
    if (!entriesByItem.has(key)) entriesByItem.set(key, []);
    entriesByItem.get(key).push(entry);
  }

  const today = todayIso();
  return items.map(({ review_days: reviewDays, ...item }) =>
    computeRegisterItem(item, entriesByItem.get(String(item.id)) ?? [], { reviewDays, today })
  );
};

export const loadComputedItem = async (itemId, db = pool) => (await loadComputedItems({ itemIds: [itemId] }, db))[0] ?? null;
