import { fail, iso, supabase } from './client'

export interface ReportSummary {
  rental: number; track: number; total: number; rentals_started: number; cancelled: number; car_hours: number
  avg_utilization: number; track_passes: number; track_amount: number; repair_cost: number; avg_rental_value: number
}

export async function fetchReportSummary(from: number, to: number) {
  const { data, error } = await supabase.rpc('report_summary', { p_from: iso(from), p_to: iso(to) })
  fail(error)
  return data as ReportSummary
}
