export type MachineStatut = 'Actif' | 'Maintenance'
export type UserRole = 'Admin' | 'ADV' | 'Atelier' | 'Client'
export type OFPriorite = 'Standard' | 'Urgence' | 'Constructeur'
export type OFStatut = 'A_planifier' | 'Planifie' | 'En_cours' | 'Termine'
export type DocumentType = 'BL' | 'Facture' | 'Autre'

export interface Machine {
  id: string
  nom: string
  statut: MachineStatut
  heures_ouverture: string
  competences_requises: string[]
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

export interface OrdreFabrication {
  id: string
  client_id: string | null
  client_nom: string
  reference_of: string
  gamme: string | null
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
}

export interface PlanningSlot {
  id: string
  of_id: string
  machine_id: string
  start_time: string
  end_time: string
  locked: boolean
  created_at: string
  updated_at: string
  // Joined fields
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
  type: 'overlap' | 'sla_breach' | 'competence_mismatch' | 'buffer_violation'
  of_id: string
  reference_of: string
  message: string
}

export interface AffectedOF {
  of_id: string
  reference_of: string
  client_nom: string
  shift_minutes: number
  new_end_time: string
  sla_breach: boolean
  sla_date: string
}

export interface ImpactResult {
  affected_ofs: AffectedOF[]
  any_sla_breach: boolean
}
