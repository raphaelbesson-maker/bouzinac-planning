import { create } from 'zustand'
import type { PlanningSlot, OrdreFabrication, Conflict } from '@/lib/types'

interface PlanningStore {
  slots: PlanningSlot[]
  unscheduledOFs: OrdreFabrication[]
  conflicts: Conflict[]
  isLoading: boolean

  setSlots: (slots: PlanningSlot[]) => void
  setUnscheduledOFs: (ofs: OrdreFabrication[]) => void
  setConflicts: (conflicts: Conflict[]) => void
  setLoading: (loading: boolean) => void

  // Optimistic: move an OF from sidebar or existing slot to a new slot
  moveSlot: (newSlot: PlanningSlot, removedOfId?: string) => void
  // Add a slot update from Realtime
  upsertSlot: (slot: PlanningSlot) => void
  removeSlot: (slotId: string) => void
  // Rollback: restore previous state after failed API call
  rollback: (previousSlots: PlanningSlot[], previousUnscheduled: OrdreFabrication[]) => void
}

export const usePlanningStore = create<PlanningStore>((set) => ({
  slots: [],
  unscheduledOFs: [],
  conflicts: [],
  isLoading: false,

  setSlots: (slots) => set({ slots }),
  setUnscheduledOFs: (unscheduledOFs) => set({ unscheduledOFs }),
  setConflicts: (conflicts) => set({ conflicts }),
  setLoading: (isLoading) => set({ isLoading }),

  moveSlot: (newSlot, removedOfId) =>
    set((state) => ({
      slots: [
        ...state.slots.filter(
          (s) => s.of_id !== newSlot.of_id && s.id !== newSlot.id
        ),
        newSlot,
      ],
      unscheduledOFs: state.unscheduledOFs.filter((of) => of.id !== newSlot.of_id),
    })),

  upsertSlot: (slot) =>
    set((state) => ({
      slots: [
        ...state.slots.filter((s) => s.id !== slot.id),
        slot,
      ],
    })),

  removeSlot: (slotId) =>
    set((state) => ({
      slots: state.slots.filter((s) => s.id !== slotId),
    })),

  rollback: (previousSlots, previousUnscheduled) =>
    set({ slots: previousSlots, unscheduledOFs: previousUnscheduled }),
}))
