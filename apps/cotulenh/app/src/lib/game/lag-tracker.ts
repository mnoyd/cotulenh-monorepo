/**
 * Tracks a lag compensation budget for online chess games.
 *
 * Each player has a quota (default 500ms) that absorbs network latency so
 * their clock isn't penalised for slow connections. The quota depletes on
 * each move and regenerates a small amount (default 100ms) per move, up to
 * the cap.
 */
export class LagTracker {
  #quota: number;
  #maxQuota: number;
  #regenPerMove: number;

  constructor(maxQuota = 500, regenPerMove = 100) {
    this.#maxQuota = maxQuota;
    this.#regenPerMove = regenPerMove;
    this.#quota = maxQuota;
  }

  /**
   * Debit estimated lag from the quota.
   *
   * @param estimatedLag - The estimated network lag in ms
   * @returns The compensation actually applied (capped at current quota)
   */
  debit(estimatedLag: number): number {
    if (!Number.isFinite(estimatedLag) || estimatedLag <= 0) {
      return 0;
    }

    const compensation = Math.min(estimatedLag, this.#quota);
    this.#quota -= compensation;
    return compensation;
  }

  /**
   * Regenerate quota after a move. Called once per move.
   * Adds `regenPerMove` ms, capped at `maxQuota`.
   */
  regenerate(): void {
    this.#quota = Math.min(this.#maxQuota, this.#quota + this.#regenPerMove);
  }

  /**
   * Reset quota to full (e.g. for a new game).
   */
  reset(): void {
    this.#quota = this.#maxQuota;
  }

  /** Current remaining quota in ms. */
  get quota(): number {
    return this.#quota;
  }
}
