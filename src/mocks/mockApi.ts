// ─── Mock API admin – reemplaza axios en modo VITE_MOCK_MODE=true ─────────────
import { store } from './store'
import { SEED_USERS } from './data'

// ─── Utilidades ──────────────────────────────────────────────────────────────
function ok<T>(data: T): Promise<{ data: T }> {
  return Promise.resolve({ data })
}

function parseUrl(url: string): { path: string; params: URLSearchParams } {
  const [path, qs = ''] = url.split('?')
  return { path: path.replace(/^\//, ''), params: new URLSearchParams(qs) }
}

function newId(): string {
  return `gen-${++store._idCounter}-${Date.now()}`
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function handleAuth(method: string, path: string, body: unknown) {
  if (method === 'POST' && path === 'auth/login') {
    const { email, password } = body as { email: string; password: string }
    const user = SEED_USERS.find(u => u.email === email && u.password === password)
    if (!user) return Promise.reject({ response: { status: 401, data: { message: 'Credenciales inválidas' } } })
    // admin y consultor pueden entrar al admin portal
    if (user.rol !== 'admin' && user.rol !== 'consultor_pricer') {
      return Promise.reject({ response: { status: 403, data: { message: 'Acceso no autorizado' } } })
    }
    const token = `mock_${user.id}`
    return ok({
      accessToken: token,
      refreshToken: `refresh_${user.id}`,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      user: { id: user.id, email: user.email, nombreCompleto: user.nombreCompleto, rol: user.rol, tenantId: user.tenantId },
    })
  }
  if (method === 'GET' && path === 'auth/me') {
    const token = localStorage.getItem('access_token') ?? ''
    const userId = token.replace('mock_', '')
    const user = SEED_USERS.find(u => u.id === userId)
    if (!user) return Promise.reject({ response: { status: 401 } })
    return ok({ id: user.id, email: user.email, nombreCompleto: user.nombreCompleto, rol: user.rol, tenantId: user.tenantId })
  }
  if (method === 'POST' && path === 'auth/logout') {
    return ok({ message: 'ok' })
  }
  return null
}

// ─── Helpers tenant → response shape ─────────────────────────────────────────
function toTenantListItem(tenant: typeof store.tenants[0]) {
  const consultores = store.consultorTenants
    .filter(ct => ct.tenantId === tenant.id)
    .map(ct => {
      const u = store.users.find(u => u.id === ct.userId)
      return u ? { userId: u.id, nombreCompleto: u.nombreCompleto, email: u.email } : null
    })
    .filter(Boolean)

  const usuariosCount = store.users.filter(u => u.tenantId === tenant.id).length

  return {
    id: tenant.id,
    nombre: tenant.nombre,
    industria: tenant.industria,
    plan: tenant.plan,
    estado: tenant.estado,
    usuariosCount,
    consultores,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
  }
}

// ─── Tenants ──────────────────────────────────────────────────────────────────
function handleTenants(method: string, path: string, body: unknown) {
  // DELETE /tenants/{id}/consultores/{userId}
  const deleteConsultorMatch = path.match(/^tenants\/([\w-]+)\/consultores\/([\w-]+)$/)
  if (method === 'DELETE' && deleteConsultorMatch) {
    const [, tenantId, userId] = deleteConsultorMatch
    store.consultorTenants = store.consultorTenants.filter(
      ct => !(ct.tenantId === tenantId && ct.userId === userId)
    )
    return ok({ message: 'ok' })
  }

  // POST /tenants/{id}/consultores
  const assignConsultorMatch = path.match(/^tenants\/([\w-]+)\/consultores$/)
  if (method === 'POST' && assignConsultorMatch) {
    const [, tenantId] = assignConsultorMatch
    const { consultorUserId } = body as { consultorUserId: string }
    const already = store.consultorTenants.find(ct => ct.tenantId === tenantId && ct.userId === consultorUserId)
    if (!already) {
      store.consultorTenants.push({ id: newId(), userId: consultorUserId, tenantId, createdAt: new Date().toISOString() })
    }
    const tenant = store.tenants.find(t => t.id === tenantId)!
    return ok(toTenantListItem(tenant))
  }

  // GET /tenants/{id}
  const getOneMatch = path.match(/^tenants\/([\w-]+)$/)
  if (method === 'GET' && getOneMatch) {
    const tenant = store.tenants.find(t => t.id === getOneMatch[1])
    if (!tenant) return Promise.reject({ response: { status: 404 } })
    return ok(toTenantListItem(tenant))
  }

  // PUT /tenants/{id}
  if (method === 'PUT' && getOneMatch) {
    const idx = store.tenants.findIndex(t => t.id === getOneMatch[1])
    if (idx === -1) return Promise.reject({ response: { status: 404 } })
    const req = body as { nombre: string; industria: string; plan: string; estado: string }
    store.tenants[idx] = { ...store.tenants[idx], ...req, updatedAt: new Date().toISOString() }
    return ok(toTenantListItem(store.tenants[idx]))
  }

  // GET /tenants
  if (method === 'GET' && path === 'tenants') {
    return ok(store.tenants.map(toTenantListItem))
  }

  // POST /tenants
  if (method === 'POST' && path === 'tenants') {
    const req = body as { nombre: string; industria: string; plan: string }
    const now = new Date().toISOString()
    const newTenant = { id: newId(), nombre: req.nombre, industria: req.industria, plan: req.plan, estado: 'activo', createdAt: now, updatedAt: now }
    store.tenants.push(newTenant)
    return ok(toTenantListItem(newTenant))
  }

  return null
}

// ─── Users ────────────────────────────────────────────────────────────────────
function toUserListItem(user: typeof store.users[0]) {
  const tenant = user.tenantId ? store.tenants.find(t => t.id === user.tenantId) : null
  return {
    id: user.id,
    email: user.email,
    nombreCompleto: user.nombreCompleto,
    rol: user.rol,
    estado: user.estado,
    tenantId: user.tenantId,
    tenantNombre: tenant?.nombre ?? null,
    invitadoPor: user.invitadoPor,
    fechaInvitacion: user.fechaInvitacion,
    createdAt: user.createdAt,
  }
}

function handleUsers(method: string, path: string, body: unknown) {
  // POST /users/{id}/activate|deactivate|reset-password
  const actionMatch = path.match(/^users\/([\w-]+)\/(activate|deactivate|reset-password)$/)
  if (method === 'POST' && actionMatch) {
    const [, userId, action] = actionMatch
    const idx = store.users.findIndex(u => u.id === userId)
    if (idx === -1) return Promise.reject({ response: { status: 404 } })
    if (action === 'activate') store.users[idx].estado = 'activo'
    if (action === 'deactivate') store.users[idx].estado = 'inactivo'
    return ok(toUserListItem(store.users[idx]))
  }

  // GET /users/{id}
  const getOneMatch = path.match(/^users\/([\w-]+)$/)
  if (method === 'GET' && getOneMatch) {
    const user = store.users.find(u => u.id === getOneMatch[1])
    if (!user) return Promise.reject({ response: { status: 404 } })
    return ok(toUserListItem(user))
  }

  // PUT /users/{id}
  if (method === 'PUT' && getOneMatch) {
    const idx = store.users.findIndex(u => u.id === getOneMatch[1])
    if (idx === -1) return Promise.reject({ response: { status: 404 } })
    const req = body as { nombreCompleto?: string; rol?: string; estado?: string }
    store.users[idx] = { ...store.users[idx], ...req }
    return ok(toUserListItem(store.users[idx]))
  }

  // GET /users?tenantId=
  if (method === 'GET' && path === 'users') {
    return ok(store.users.map(toUserListItem))
  }

  // POST /users
  if (method === 'POST' && path === 'users') {
    const req = body as { email: string; nombreCompleto: string; password?: string; rol: string; tenantId?: string | null }
    const now = new Date().toISOString()
    const newUser = {
      id: newId(),
      email: req.email,
      password: req.password ?? '123456',
      nombreCompleto: req.nombreCompleto,
      rol: req.rol,
      tenantId: req.tenantId ?? null,
      estado: 'activo',
      invitadoPor: null,
      fechaInvitacion: null,
      createdAt: now,
    }
    store.users.push(newUser)
    return ok(toUserListItem(newUser))
  }

  return null
}

// ─── Router principal ─────────────────────────────────────────────────────────
function route<T>(method: string, rawUrl: string, body?: unknown): Promise<{ data: T }> {
  const { path, params: _params } = parseUrl(rawUrl)

  const authResult = handleAuth(method, path, body)
  if (authResult) return authResult as Promise<{ data: T }>

  if (path === 'tenants' || path.startsWith('tenants/')) {
    const r = handleTenants(method, path, body)
    if (r) return r as Promise<{ data: T }>
  }

  if (path === 'users' || path.startsWith('users/')) {
    const r = handleUsers(method, path, body)
    if (r) return r as Promise<{ data: T }>
  }

  console.warn(`[mockApi admin] Unhandled: ${method} /${path}`)
  return Promise.reject({ response: { status: 404, data: { message: `Mock: ruta no encontrada: ${method} /${path}` } } })
}

// ─── Interfaz pública (compatible con axios) ──────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockApi: any = {
  get: <T>(url: string) => route<T>('GET', url),
  post: <T>(url: string, body?: unknown) => route<T>('POST', url, body),
  put: <T>(url: string, body?: unknown) => route<T>('PUT', url, body),
  delete: <T>(url: string) => route<T>('DELETE', url),
  patch: <T>(url: string, body?: unknown) => route<T>('PATCH', url, body),
}

export default mockApi
