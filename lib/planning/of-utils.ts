import type { OFOperation, OrdreFabrication } from '@/lib/types'

export function getNextOperation(of: OrdreFabrication): OFOperation | undefined {
  return (of.of_operations ?? [])
    .filter((op) => op.statut === 'A_planifier')
    .sort((a, b) => a.ordre - b.ordre)[0]
}
