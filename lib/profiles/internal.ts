/**
 * Internal (test/support) accounts — QA data cleanup before handover.
 *
 * profiles.is_internal = TRUE hides an account from the client's views:
 * employee lists and pickers, Wochenplanung, reports, Fristen and the
 * dashboard. Internal staff (a viewer who is internal) still see everyone,
 * so acceptance tests can run on production with internal accounts.
 */

interface Filterable<Q> {
  eq(column: string, value: unknown): Q
}

/** Adds `is_internal = false` unless the viewer is internal staff. */
export function hideInternal<Q extends Filterable<Q>>(query: Q, viewer: { is_internal?: boolean | null } | null | undefined): Q {
  return viewer?.is_internal ? query : query.eq('is_internal', false)
}

/** Client-side variant for already loaded rows. */
export function visibleProfiles<T extends { is_internal?: boolean | null }>(rows: T[], viewer: { is_internal?: boolean | null } | null | undefined): T[] {
  return viewer?.is_internal ? rows : rows.filter((r) => r.is_internal !== true)
}
