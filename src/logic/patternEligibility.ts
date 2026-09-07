import type { Moment } from '../domain/harbor';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Pattern Passive Mirroring — Deterministic Gate Stack.
 *
 * All 4 gates must pass. No float, no AI scoring. Returns the candidate
 * Moment pool (already validated) or null. The AI's only job after this is
 * literal-anchor selection inside the returned pool.
 *
 * Gate parameters (see CORE_ARCHITECTURE.md §Pattern):
 *   G1  N ≥ 3 valid moments (after G4 content filter)
 *   G2  Total span: 7d ≤ Δt ≤ 30d
 *   G3  Evidence crosses at least 24 hours
 *
 *   G4  Content length > 15 characters (rejects pure noise)
 */
export const patternEligibility = (moments: Moment[]): Moment[] | null => {
    // Work on the most recent 60 moments, oldest-first
    const pool = [...moments]
        .filter(m => !m.deletedAt)
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(-60);

    // G4 first: filter out sub-10-char entries
    const valid = pool.filter(m => m.content.trim().length > 15);

    // G1
    if (valid.length < 3) return null;

    // G2: span of the valid pool
    const earliest = valid[0].createdAt;
    const latest = valid.at(-1)!.createdAt;
    const span = latest - earliest;
    if (span < 7 * DAY || span > 30 * DAY) return null;

    // G3: evidence must cross a full 24-hour interval.
    if (!valid.some((m, i) => i > 0 && m.createdAt - valid[i - 1].createdAt >= DAY)) return null;

    return valid;
};
