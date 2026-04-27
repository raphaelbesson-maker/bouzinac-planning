'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePlanningStore } from '@/stores/planningStore'
import type { OFOperation } from '@/lib/types'

export function useRealtimePlanning(dateRange: { start: string; end: string }) {
  const { upsertOperation, removeOperation } = usePlanningStore()

  useEffect(() => {
    const supabase = createClient()
    const channelName = `planning-ops-${dateRange.start}-${dateRange.end}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'of_operations',
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            removeOperation(payload.old.id as string)
          } else {
            upsertOperation(payload.new as OFOperation)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [dateRange.start, dateRange.end, upsertOperation, removeOperation])
}
