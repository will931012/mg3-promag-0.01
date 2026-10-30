import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { ALERTS } from "../src/constants/submittal-register.js";
import { addDays, computeLogEntry, computeRegisterItem, isOpenItem } from "../src/services/register-status.js";

const item = (overrides = {}) => ({
  id: 1,
  submittal_no: "08 44 00-01",
  description: "Window wall",
  ahj: "Bldg Dept (NOA)",
  in_use: true,
  lead_time_weeks: null,
  needed_on_site: null,
  sent_to_ahj: null,
  ahj_approved: null,
  ...overrides
});

const entry = (overrides = {}) => ({
  rev: 0,
  received_from_sub: null,
  sent_to: "",
  date_sent: null,
  returned_by_reviewer: null,
  action_code: "",
  returned_to_sub: null,
  ...overrides
});

// The worked example on the HOW TO USE tab.
const rev0 = entry({
  rev: 0,
  received_from_sub: "2026-11-02",
  sent_to: "Architect",
  date_sent: "2026-11-03",
  returned_by_reviewer: "2026-11-16",
  action_code: "Revise & Resubmit",
  returned_to_sub: "2026-11-17"
});
const rev1 = entry({
  rev: 1,
  received_from_sub: "2026-12-01",
  sent_to: "Architect",
  date_sent: "2026-12-02",
  returned_by_reviewer: "2026-12-10",
  action_code: "Approved as Noted",
  returned_to_sub: "2026-12-11"
});

describe("log entries", () => {
  test("worked example: Rev 0 is superseded, Rev 1 is closed", () => {
    const options = { today: "2026-12-15" };
    const first = computeLogEntry(rev0, [rev0, rev1], options);
    const second = computeLogEntry(rev1, [rev0, rev1], options);

    assert.equal(first.review_due, "2026-11-17");
    assert.equal(first.ball_in_court, "Superseded");
    assert.equal(first.days_in_review, 13);
    assert.equal(first.days_with_ball, null);

    assert.equal(second.review_due, "2026-12-16");
    assert.equal(second.ball_in_court, "Closed");
    assert.equal(second.days_in_review, 8);
  });

  test("ball in court follows the dates as they are filled in", () => {
    const today = { today: "2026-11-05" };
    const ball = (overrides) => computeLogEntry(entry(overrides), [], today).ball_in_court;

    assert.equal(ball({}), "Subcontractor");
    assert.equal(ball({ received_from_sub: "2026-11-02" }), "GC");
    assert.equal(ball({ received_from_sub: "2026-11-02", date_sent: "2026-11-03", sent_to: "MEP Engineer" }), "MEP Engineer");
    assert.equal(ball({ date_sent: "2026-11-03" }), "Reviewer");
    assert.equal(ball({ date_sent: "2026-11-03", returned_by_reviewer: "2026-11-04" }), "GC");
    assert.equal(ball({ returned_by_reviewer: "2026-11-04", action_code: "Rejected", returned_to_sub: "2026-11-05" }), "Subcontractor");
    assert.equal(ball({ returned_by_reviewer: "2026-11-04", action_code: "For Record Only", returned_to_sub: "2026-11-05" }), "Closed");
  });

  test("days with ball counts from the latest date entered", () => {
    const result = computeLogEntry(entry({ received_from_sub: "2026-11-02", date_sent: "2026-11-03", sent_to: "Architect" }), [], {
      today: "2026-11-10"
    });
    assert.equal(result.days_with_ball, 7);
    assert.equal(result.days_in_review, 7);
  });

  test("alerts", () => {
    const alert = (overrides, today) => computeLogEntry(entry(overrides), [], { today }).alert;

    // Due on 11/17: not overdue on the due date itself, overdue the day after.
    assert.equal(alert({ date_sent: "2026-11-03", sent_to: "Architect" }, "2026-11-17"), "");
    assert.equal(alert({ date_sent: "2026-11-03", sent_to: "Architect" }, "2026-11-18"), ALERTS.REVIEW_OVERDUE);
    assert.equal(alert({ date_sent: "2026-11-03", returned_by_reviewer: "2026-11-10", sent_to: "Architect" }, "2026-11-20"), ALERTS.ENTER_ACTION_CODE);
    assert.equal(alert({ date_sent: "2026-11-03" }, "2026-11-04"), ALERTS.ENTER_REVIEWER);
  });

  test("superseded revisions don't raise alerts", () => {
    const unanswered = entry({ rev: 0, date_sent: "2026-10-01", sent_to: "Architect" });
    const resubmitted = entry({ rev: 1, received_from_sub: "2026-11-20" });
    const result = computeLogEntry(unanswered, [unanswered, resubmitted], { today: "2026-12-01" });
    assert.equal(result.ball_in_court, "Superseded");
    assert.equal(result.alert, "");
  });

  test("review period comes from the project setting", () => {
    assert.equal(computeLogEntry(entry({ date_sent: "2026-11-03" }), [], { reviewDays: 10 }).review_due, "2026-11-13");
  });
});

describe("register items", () => {
  test("not submitted yet", () => {
    const result = computeRegisterItem(item(), [], { today: "2026-11-01" });
    assert.equal(result.submissions, 0);
    assert.equal(result.current_status, "Not submitted");
    assert.equal(result.ball_in_court, "Subcontractor");
    assert.equal(result.latest_rev, null);
    assert.equal(isOpenItem(result), false);
  });

  test("status and ball come from the latest revision", () => {
    const result = computeRegisterItem(item(), [rev0, entry({ rev: 1, received_from_sub: "2026-12-01" })], { today: "2026-12-03" });
    assert.equal(result.submissions, 2);
    assert.equal(result.latest_rev, 1);
    assert.equal(result.current_status, "In review");
    assert.equal(result.ball_in_court, "GC");
    assert.equal(result.days_with_ball, 2);
    assert.deepEqual(result.log.map((e) => e.rev), [1, 0]);
    assert.equal(isOpenItem(result), true);
  });

  test("worked example: AHJ alerts after design approval", () => {
    const options = { today: "2026-12-15" };
    const closed = computeRegisterItem(item(), [rev0, rev1], options);
    assert.equal(closed.current_status, "Approved as Noted");
    assert.equal(closed.design_approved, "2026-12-10");
    assert.equal(closed.alert, ALERTS.SEND_TO_AHJ);
    assert.equal(isOpenItem(closed), false);

    assert.equal(computeRegisterItem(item({ sent_to_ahj: "2026-12-12" }), [rev0, rev1], options).alert, ALERTS.AT_AHJ_PENDING);
    assert.equal(
      computeRegisterItem(item({ sent_to_ahj: "2026-12-12", ahj_approved: "2026-12-20" }), [rev0, rev1], options).alert,
      ""
    );
    assert.equal(computeRegisterItem(item({ ahj: "" }), [rev0, rev1], options).alert, "");
  });

  test("long-lead items: submit by, late to submit, needed on site", () => {
    const longLead = item({ lead_time_weeks: 12, needed_on_site: "2027-06-30" });
    const expectedSubmitBy = addDays("2027-06-30", -(12 * 7) - 14);

    const early = computeRegisterItem(longLead, [], { today: "2027-01-01" });
    assert.equal(early.submit_by, expectedSubmitBy);
    assert.equal(early.alert, "");

    assert.equal(computeRegisterItem(longLead, [], { today: addDays(expectedSubmitBy, 1) }).alert, ALERTS.LATE_TO_SUBMIT);
    assert.equal(computeRegisterItem(longLead, [], { today: "2027-07-01" }).alert, ALERTS.NEEDED_ON_SITE);
    assert.equal(
      computeRegisterItem(longLead, [entry({ received_from_sub: "2027-03-01" })], { today: addDays(expectedSubmitBy, 1) }).alert,
      ""
    );
  });

  test("a lead time of zero still gives a submit-by date", () => {
    assert.equal(computeRegisterItem(item({ lead_time_weeks: 0, needed_on_site: "2027-01-31" }), [], {}).submit_by, "2027-01-17");
  });

  test("items not used on the project have no status", () => {
    const result = computeRegisterItem(item({ in_use: false }), [rev0], { today: "2026-12-15" });
    assert.equal(result.current_status, "");
    assert.equal(result.alert, "");
    assert.equal(result.submissions, null);
    assert.equal(result.log.length, 1);
    assert.equal(isOpenItem(result), false);
  });
});
