'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlanningStore } from '@/stores/planningStore'

export function usePlanning(dateRange: { start: string; end: string }) {
  const { setOperations, setUnscheduledOFs, setLoading } = usePlanningStore()

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      setLoading(true)
      const [opsRes, ofsRes] = await Promise.all([
        // Scheduled operations in the date range (for Gantt)
        supabase
          .from('of_operations')
          .select('*, of:ordres_fabrication(*), machine:machines(*)')
          .not('start_time', 'is', null)
          .gte('start_time', dateRange.start)
          .lte('end_time', dateRange.end),
        // OFs with at least one pending operation (for sidebar)
        supabase
          .from('ordres_fabrication')
          .select('*, of_operations(id, ordre, nom, categorie_machine, duree_minutes, statut, start_time, end_time, machine_id, locked)')
          .eq('statut', 'A_planifier')
          .order('sla_date', { ascending: true }),
      ])

      if (opsRes.data) setOperations(opsRes.data)
      if (ofsRes.data) setUnscheduledOFs(ofsRes.data)
      setLoading(false)
    }

    load()
  }, [dateRange.start, dateRange.end, setOperations, setUnscheduledOFs, setLoading])
}
