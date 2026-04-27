'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlanningStore } from '@/stores/planningStore'

export function usePlanning(dateRange: { start: string; end: string }) {
  const { setSlots, setUnscheduledOFs, setLoading } = usePlanningStore()

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      setLoading(true)
      const [slotsRes, ofsRes] = await Promise.all([
        supabase
          .from('planning_slots')
          .select('*, of:ordres_fabrication(*)')
          .gte('start_time', dateRange.start)
          .lte('end_time', dateRange.end),
        supabase
          .from('ordres_fabrication')
          .select('*')
          .eq('statut', 'A_planifier')
          .order('sla_date', { ascending: true }),
      ])

      if (slotsRes.data) setSlots(slotsRes.data)
      if (ofsRes.data) setUnscheduledOFs(ofsRes.data)
      setLoading(false)
    }

    load()
  }, [dateRange.start, dateRange.end, setSlots, setUnscheduledOFs, setLoading])
}
