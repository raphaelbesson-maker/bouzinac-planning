'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Machine } from '@/lib/types'

export function useMachines() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('machines')
      .select('*')
      .order('nom')
      .then(({ data }) => {
        if (data) setMachines(data)
        setLoading(false)
      })
  }, [])

  return { machines, loading }
}
