import { create } from 'zustand'
import type { OFOperation, OFStatut, OrdreFabrication, Conflict } from '@/lib/types'

interface PlanningStore {
  operations: OFOperation[]
  unscheduledOFs: OrdreFabrication[]
  conflicts: Conflict[]
  isLoading: boolean

  setOperations: (ops: OFOperation[]) => void
  setUnscheduledOFs: (ofs: OrdreFabrication[]) => void
  setConflicts: (conflicts: Conflict[]) => void
  setLoading: (loading: boolean) => void

  // Optimistic: schedule an operation (move from sidebar → gantt)
  scheduleOperation: (op: OFOperation) => void
  // Realtime: upsert/remove a single operation
  upsertOperation: (op: OFOperation) => void
  removeOperation: (opId: string) => void
  // Rollback after failed API call
  rollback: (previousOps: OFOperation[], previousUnscheduled: OrdreFabrication[]) => void
}

export const usePlanningStore = create<PlanningStore>((set) => ({
  operations: [],
  unscheduledOFs: [],
  conflicts: [],
  isLoading: false,

  setOperations: (operations) => set({ operations }),
  setUnscheduledOFs: (unscheduledOFs) => set({ unscheduledOFs }),
  setConflicts: (conflicts) => set({ conflicts }),
  setLoading: (isLoading) => set({ isLoading }),

  scheduleOperation: (op) =>
    set((state) => {
      // Add/replace this operation in the gantt list
      const newOps = [
        ...state.operations.filter((o) => o.id !== op.id),
        op,
      ]
      // Update the OF in the unscheduled list (update its of_operations)
      const newUnscheduled = state.unscheduledOFs
        .map((of) => {
          if (of.id !== op.of_id) return of
          const updatedOps = (of.of_operations ?? []).map((o) =>
            o.id === op.id ? op : o
          )
          // Compute new OF statut
          const allDone = updatedOps.every((o) => o.statut === 'Termine')
          const anyInProgress = updatedOps.some((o) => o.statut === 'En_cours')
          const anyPending = updatedOps.some((o) => o.statut === 'A_planifier')
          const newStatut: OFStatut = allDone ? 'Termine' : anyInProgress ? 'En_cours' : anyPending ? 'A_planifier' : 'Planifie'
          return { ...of, of_operations: updatedOps, statut: newStatut }
        })
        // Remove OFs with no pending operations left
        .filter((of) => (of.of_operations ?? []).some((o) => o.statut === 'A_planifier'))
      return { operations: newOps, unscheduledOFs: newUnscheduled }
    }),

  upsertOperation: (op) =>
    set((state) => ({
      operations: [
        ...state.operations.filter((o) => o.id !== op.id),
        ...(op.start_time ? [op] : []),
      ],
    })),

  removeOperation: (opId) =>
    set((state) => ({
      operations: state.operations.filter((o) => o.id !== opId),
    })),

  rollback: (previousOps, previousUnscheduled) =>
    set({ operations: previousOps, unscheduledOFs: previousUnscheduled }),
}))
