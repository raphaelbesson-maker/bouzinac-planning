export type MachineStatut = 'Actif' | 'Maintenance'
export type UserRole = 'Admin' | 'ADV' | 'Atelier' | 'Client'
export type OFPriorite = 'Standard' | 'Urgence' | 'Constructeur'
export type OFStatut = 'A_planifier' | 'Planifie' | 'En_cours' | 'Termine'
export type OpStatut = 'A_planifier' | 'Planifie' | 'En_cours' | 'Termine'
export type DocumentType = 'BL' | 'Facture' | 'Autre'

export interface Machine {
  id: string
  nom: string
  statut: MachineStatut
  heures_ouverture: string
  competences_requises: string[]
  categorie: string | null
  created_at: string
}

export interface Operateur {
  id: string
  nom: string
  role: UserRole
  competences: string[]
  client_id: string | null
  created_at: string
}

export interface Document {
  id: string
  of_id: string
  type: DocumentType
  nom_fichier: string
  storage_path: string | null
  created_at: string
}

export interface NotificationLog {
  id: string
  of_id: string
  type: string
  recipient_email: string
  sent_at: string
}

export interface Client {
  id: string
  nom: string
  priorite_rang: number
  is_premium: boolean
  created_at: string
}

export interface Gamme {
  id: string
  nom: string
  description: string | null
  created_at?: string
  gamme_operations?: GammeOperation[]
}

export interface GammeOperation {
  id: string
  gamme_id?: string
  ordre: number
  nom: string
  categorie_machine: string
  duree_minutes: number
}

export interface OFOperation {
  id: string
  of_id: string
  gamme_operation_id: string | null
  ordre: number
  nom: string
  categorie_machine: string
  duree_minutes: number
  machine_id: string | null
  statut: OpStatut
  start_time: string | null
  end_time: string | null
  locked: boolean
  created_at: string
  updated_at: string
  // Joined
  of?: OrdreFabrication
  machine?: Machine
}

export interface OrdreFabrication {
  id: string
  client_id: string | null
  client_nom: string
  reference_of: string
  gamme: string | null
  gamme_id: string | null
  sla_date: string
  priorite: OFPriorite
  temps_estime_minutes: number
  statut: OFStatut
  machine_id: string | null
  start_time: string | null
  end_time: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  of_operations?: OFOperation[]
}

/** @deprecated — use OFOperation. Kept for backward compat with simulateur. */
export interface PlanningSlot {
  id: string
  of_id: string
  machine_id: string
  start_time: string
  end_time: string
  locked: boolean
  created_at: string
  updated_at: string
  of?: OrdreFabrication
}

export interface Reglement {
  id: string
  key: string
  value: unknown
  label: string | null
  updated_at: string
}

export interface Conflict {
  type: 'overlap' | 'sla_breach' | 'competence_mismatch' | 'buffer_violation' | 'sequential'
  of_id: string
  reference_of: string
  message: string
}

export interface AffectedOF {
  of_id: string
  reference_of: string
  client_nom: string
  operation_nom: string
  shift_minutes: number
  new_end_time: string
  sla_breach: boolean
  sla_date: string
}

export interface ImpactResult {
  affected_ofs: AffectedOF[]
  any_sla_breach: boolean
}
