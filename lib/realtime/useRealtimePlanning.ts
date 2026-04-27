'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlanningStore } from '@/stores/planningStore'
import type { PlanningSlot } from '@/lib/types'

export function useRealtimePlanning(dateRange: { start: string; end: string }) {
  const { upsertSlot, removeSlot } = usePlanningStore()

  useEffect(() => {
    const supabase = createClient()
    const channelName = `planning-${dateRange.start}-${dateRange.end}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planning_slots',
          filter: `start_time=gte.${dateRange.start}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            removeSlot(payload.old.id as string)
          } else {
            upsertSlot(payload.new as PlanningSlot)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [dateRange.start, dateRange.end, upsertSlot, removeSlot])
}
