// ─── Mock data admin – basado en SeedData.cs ────────────────────────────────

export interface MockUser {
  id: string
  email: string
  password: string
  nombreCompleto: string
  rol: string
  tenantId: string | null
  estado: string
  invitadoPor: string | null
  fechaInvitacion: string | null
  createdAt: string
}

export interface MockTenant {
  id: string
  nombre: string
  industria: string
  plan: string
  estado: string
  createdAt: string
  updatedAt: string
}

export interface MockConsultorTenant {
  id: string
  userId: string
  tenantId: string
  createdAt: string
}

export const SEED_TENANTS: MockTenant[] = [
  {
    id: 'tenant-001',
    nombre: 'ConGrupo',
    industria: 'consumo_masivo',
    plan: 'enterprise',
    estado: 'activo',
    createdAt: new Date(Date.now() - 90 * 86400_000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const SEED_USERS: MockUser[] = [
  {
    id: 'user-admin-001',
    email: 'admin@prisier.com',
    password: '123456',
    nombreCompleto: 'Admin Prisier',
    rol: 'admin',
    tenantId: null,
    estado: 'activo',
    invitadoPor: null,
    fechaInvitacion: null,
    createdAt: new Date(Date.now() - 90 * 86400_000).toISOString(),
  },
  {
    id: 'user-consultor-001',
    email: 'consultor@prisier.com',
    password: '123456',
    nombreCompleto: 'Consultor Demo',
    rol: 'consultor_pricer',
    tenantId: null,
    estado: 'activo',
    invitadoPor: null,
    fechaInvitacion: null,
    createdAt: new Date(Date.now() - 90 * 86400_000).toISOString(),
  },
  {
    id: 'user-cliente-001',
    email: 'cliente@congrupo.com',
    password: '123456',
    nombreCompleto: 'Cliente ConGrupo',
    rol: 'cliente_comercial',
    tenantId: 'tenant-001',
    estado: 'activo',
    invitadoPor: 'user-consultor-001',
    fechaInvitacion: new Date(Date.now() - 60 * 86400_000).toISOString(),
    createdAt: new Date(Date.now() - 60 * 86400_000).toISOString(),
  },
]

export const SEED_CONSULTOR_TENANTS: MockConsultorTenant[] = [
  {
    id: 'ct-001',
    userId: 'user-consultor-001',
    tenantId: 'tenant-001',
    createdAt: new Date(Date.now() - 90 * 86400_000).toISOString(),
  },
]
