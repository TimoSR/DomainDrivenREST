/**
 * System-level UI defaults and storage contracts.
 *
 * High-stability zone, same role as the backend's `_CRITICAL` folders: everything here
 * changes the tool's out-of-the-box behaviour for every user on every project, so a change
 * is a product decision rather than a tweak. Nothing here is per-user state — that lives in
 * a store; these are the constants those stores are built around.
 */

/**
 * Whether rail groups (route tags, and the domain type categories) start collapsed.
 *
 * A group is still opened automatically when it contains the current selection or a filter
 * match, so a deep link never lands you in a rail that shows nothing; this constant only
 * governs the resting state. An explicit click always wins for that group.
 */
export const RAIL_GROUPS_COLLAPSED_BY_DEFAULT = false;

/**
 * Enums at or below this many members render as a segmented row; larger ones collapse to a
 * select. Above ~4 the row stops fitting the composer column at its minimum width.
 */
export const INLINE_ENUM_LIMIT = 4;

/** How deep sample-data generation will follow nested types before giving up. */
export const SAMPLE_DATA_MAX_DEPTH = 6;

/** Requests kept in local history, and how many of those the command palette surfaces. */
export const HISTORY_MAX_ENTRIES = 50;
export const HISTORY_PALETTE_LIMIT = 8;

/**
 * localStorage keys. Renaming one silently orphans every existing user's data, so treat
 * these as a compatibility contract rather than an implementation detail.
 */
export const STORAGE_KEYS = {
  theme: "ddr.theme",
  history: "ddr.history",
} as const;

/** Milliseconds. */
export const TIMING = {
  /** Debounce before asking the server to re-validate the draft body. */
  validateDebounce: 400,
  /** How long the "Copied" / "Copy blocked" feedback stays up. */
  copyFeedback: 2000,
} as const;
