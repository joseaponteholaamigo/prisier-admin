export interface TenantListItem {
  id: string
  nombre: string
  industria: string
  plan: string
  estado: string
  usuariosCount: number
  consultores: ConsultorInfo[]
}

export interface TenantResponse extends TenantListItem {
  createdAt: string
  updatedAt: string
}

export interface ConsultorInfo {
  userId: string
  nombreCompleto: string
  email: string
}

export interface UserListItem {
  id: string
  email: string
  nombreCompleto: string
  rol: string
  estado: string
  tenantId: string | null
  tenantNombre: string | null
}

export interface UserResponse extends UserListItem {
  invitadoPor: string | null
  fechaInvitacion: string | null
  createdAt: string
}
