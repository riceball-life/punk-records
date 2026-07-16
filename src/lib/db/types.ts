/** A calendar-day key in local time, formatted `YYYY-MM-DD`. */
export type DayKey = string;

/**
 * One journal entry, keyed by its local calendar day.
 * Days with no stored `Entry` are simply absent — they render as empty in the UI.
 */
export interface Entry {
  /** Primary key: local calendar day, `YYYY-MM-DD`. */
  date: DayKey;
  /** The plain-text body for that day. */
  text: string;
  /** ISO 8601 timestamp of the last write. Used for future backup/sync merges. */
  updatedAt: string;
}
