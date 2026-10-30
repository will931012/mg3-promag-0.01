// Calculated columns of the shop drawing register, ported from the formulas in
// Shop Drawing Log.xlsx (LOG columns H and L-O, REGISTER columns N-T and W).
// Dates are "YYYY-MM-DD" strings; `today` is passed in so results are testable.

import { ALERTS, BALL, CLOSING_ACTION_CODES, DEFAULT_REVIEW_DAYS } from "../constants/submittal-register.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const toDayNumber = (isoDate) => {
  if (!isoDate) return null;
  const [year, month, day] = String(isoDate).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day) / DAY_MS;
};

const fromDayNumber = (dayNumber) => new Date(dayNumber * DAY_MS).toISOString().slice(0, 10);

export const addDays = (isoDate, days) => {
  const dayNumber = toDayNumber(isoDate);
  return dayNumber === null ? null : fromDayNumber(dayNumber + days);
};

export const daysBetween = (fromIso, toIso) => {
  const from = toDayNumber(fromIso);
  const to = toDayNumber(toIso);
  return from === null || to === null ? null : to - from;
};

// The register is used in Florida, so "today" follows that calendar rather than the server's UTC clock.
export const todayIso = (timeZone = process.env.APP_TIMEZONE || "America/New_York") =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const latestDate = (...dates) => {
  const days = dates.map(toDayNumber).filter((value) => value !== null);
  return days.length ? fromDayNumber(Math.max(...days)) : null;
};

/**
 * Calculated fields for one LOG row. `siblings` are all log entries of the same register item.
 */
export const computeLogEntry = (entry, siblings, { reviewDays = DEFAULT_REVIEW_DAYS, today = todayIso() } = {}) => {
  const reviewDue = entry.date_sent ? addDays(entry.date_sent, reviewDays) : null;
  const daysInReview = entry.date_sent ? daysBetween(entry.date_sent, entry.returned_by_reviewer || today) : null;

  let ballInCourt;
  if (siblings.some((other) => other.rev > entry.rev)) ballInCourt = BALL.SUPERSEDED;
  else if (entry.returned_to_sub) ballInCourt = CLOSING_ACTION_CODES.has(entry.action_code) ? BALL.CLOSED : BALL.SUBCONTRACTOR;
  else if (entry.returned_by_reviewer) ballInCourt = BALL.GC;
  else if (entry.date_sent) ballInCourt = entry.sent_to || BALL.REVIEWER;
  else if (entry.received_from_sub) ballInCourt = BALL.GC;
  else ballInCourt = BALL.SUBCONTRACTOR;

  const lastMovement = latestDate(entry.received_from_sub, entry.date_sent, entry.returned_by_reviewer, entry.returned_to_sub);
  const daysWithBall =
    ballInCourt === BALL.CLOSED || ballInCourt === BALL.SUPERSEDED || !lastMovement ? null : daysBetween(lastMovement, today);

  // The spreadsheet still flags superseded revisions; here they stay quiet since a later revision replaced them.
  let alert = "";
  if (ballInCourt !== BALL.SUPERSEDED) {
    if (entry.date_sent && !entry.returned_by_reviewer && daysBetween(reviewDue, today) > 0) alert = ALERTS.REVIEW_OVERDUE;
    else if (entry.returned_by_reviewer && !entry.action_code) alert = ALERTS.ENTER_ACTION_CODE;
    else if (entry.date_sent && !entry.sent_to) alert = ALERTS.ENTER_REVIEWER;
  }

  return {
    ...entry,
    review_due: reviewDue,
    days_in_review: daysInReview,
    ball_in_court: ballInCourt,
    days_with_ball: daysWithBall,
    alert
  };
};

const EMPTY_ITEM_STATUS = {
  submit_by: null,
  submissions: null,
  latest_rev: null,
  current_status: "",
  ball_in_court: "",
  days_with_ball: null,
  design_approved: null,
  alert: ""
};

/**
 * Calculated fields for one REGISTER row plus its computed log entries (newest revision first).
 */
export const computeRegisterItem = (item, logEntries, options = {}) => {
  const { reviewDays = DEFAULT_REVIEW_DAYS, today = todayIso() } = options;
  const entries = logEntries
    .map((entry) => computeLogEntry(entry, logEntries, { reviewDays, today }))
    .sort((a, b) => b.rev - a.rev);

  if (!item.in_use) return { ...item, ...EMPTY_ITEM_STATUS, log: entries };

  const submitBy =
    item.needed_on_site && item.lead_time_weeks !== null && item.lead_time_weeks !== undefined
      ? addDays(item.needed_on_site, -(Number(item.lead_time_weeks) * 7) - reviewDays)
      : null;

  const latest = entries[0] ?? null;
  const currentStatus = latest ? latest.action_code || "In review" : "Not submitted";
  const ballInCourt = latest ? latest.ball_in_court : BALL.SUBCONTRACTOR;
  const designApproved = latest && CLOSING_ACTION_CODES.has(latest.action_code) ? latest.returned_by_reviewer : null;
  const hasAhj = Boolean(String(item.ahj || "").trim());

  let alert;
  if (ballInCourt === BALL.CLOSED) {
    alert = hasAhj && !item.ahj_approved ? (item.sent_to_ahj ? ALERTS.AT_AHJ_PENDING : ALERTS.SEND_TO_AHJ) : "";
  } else if (item.needed_on_site && daysBetween(item.needed_on_site, today) > 0) {
    alert = ALERTS.NEEDED_ON_SITE;
  } else if (submitBy && daysBetween(submitBy, today) > 0 && !latest) {
    alert = ALERTS.LATE_TO_SUBMIT;
  } else {
    alert = latest?.alert ?? "";
  }

  return {
    ...item,
    submit_by: submitBy,
    submissions: entries.length,
    latest_rev: latest ? latest.rev : null,
    current_status: currentStatus,
    ball_in_court: ballInCourt,
    days_with_ball: latest ? latest.days_with_ball : null,
    design_approved: designApproved,
    alert,
    log: entries
  };
};

/**
 * An in-use item counts as open once it has been submitted and is not closed yet.
 */
export const isOpenItem = (computed) => computed.in_use && computed.submissions > 0 && computed.ball_in_court !== BALL.CLOSED;

/**
 * Dashboard counts: open submittals, reviews past due, and items with any alert.
 */
export const summarizeRegister = (computedItems) => ({
  submittals_open: computedItems.filter(isOpenItem).length,
  submittals_late: computedItems.filter((item) => item.alert === ALERTS.REVIEW_OVERDUE).length,
  alerts: computedItems.filter((item) => item.alert).length
});
