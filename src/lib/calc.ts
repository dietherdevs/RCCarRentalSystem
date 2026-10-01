export interface RevenueTxn {
  at: number
  rental: number
  track: number
}

// Sums the per-transaction RC/Track split produced by the v_revenue_txns SQL view.
export function revenueBetween(rows: RevenueTxn[], from: number, to: number) {
  let rental = 0
  let track = 0
  for (const t of rows) {
    if (t.at >= from && t.at < to) {
      rental += t.rental
      track += t.track
    }
  }
  return { rental: Math.round(rental), track: Math.round(track), total: Math.round(rental + track) }
}
