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

// ─── Reglas ───────────────────────────────────────────────────────────────────

export interface MockSku {
  id: string
  ean: string
  nombre: string
  categoria: string
  marca: string
  tenantId: string
  pvpSugerido: number
  costoVariable: number
  pesoProfitPool: number
}

export interface MockCompetidor {
  id: string
  nombre: string
  pais: string
  tenantId: string
}

// R-002 — Atributos por categoría
export interface MockAtributoCategoria {
  nombre: string
  peso: number
  orden: number
  calificacion?: number
}

export interface MockCategoriaAtributos {
  categoria: string
  atributos: MockAtributoCategoria[]
}

// R-002 — Calificaciones por SKU × atributo × {propio, competidor}
export interface MockCalificacion {
  skuId: string
  atributo: string
  calificacionPropia: number
  calificacionesCompetidor: Record<string, number>
}

// R-004 — sin confianza ni R²
export interface MockElasticidad {
  skuId: string
  coeficiente: number
}

// R-005/R-006 — Config estructuras
export interface MockColConfig {
  iva?: number
  tipoEstructura?: string
}

// R-007 — canales con margen simple
export interface MockCanalSimple {
  nombre: string
  margen: number
}

export interface MockCanalesMargenes {
  iva: number
  canales: MockCanalSimple[]
}

export interface MockUmbrales {
  umbralSuperior: number
  umbralInferior: number
}

// R-005/R-006 — Portafolio unificado (IVA + SKUs)
export interface MockPortafolio {
  iva: number
}

// R-009 — Peso profit pool por SKU
export interface MockPesoItem {
  skuId: string
  peso: number
}

// R-010 — Retailers
export interface MockRetailer {
  id: string
  nombre: string
  activo: boolean
  tenantId: string
}

// ─── Seed Tenants ─────────────────────────────────────────────────────────────

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

// ─── Seed Users ───────────────────────────────────────────────────────────────

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
    rol: 'consultor_prisier',
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

// ─── Seed SKUs (incluye PVP, costo, peso profit pool) ───────────────────────

export const SEED_SKUS: MockSku[] = [
  // Bebidas Energéticas — PowerUp
  { id: 'sku-001', ean: '7701234000001', nombre: 'Energética 250ml',          categoria: 'Bebidas Energéticas', marca: 'PowerUp',    tenantId: 'tenant-001', pvpSugerido:  5500, costoVariable: 2200, pesoProfitPool: 0.04 },
  { id: 'sku-002', ean: '7701234000002', nombre: 'Energética 500ml',          categoria: 'Bebidas Energéticas', marca: 'PowerUp',    tenantId: 'tenant-001', pvpSugerido:  9500, costoVariable: 3800, pesoProfitPool: 0.04 },
  { id: 'sku-003', ean: '7701234000003', nombre: 'Energética 250ml Zero',     categoria: 'Bebidas Energéticas', marca: 'PowerUp',    tenantId: 'tenant-001', pvpSugerido:  5500, costoVariable: 2300, pesoProfitPool: 0.04 },
  { id: 'sku-004', ean: '7701234000004', nombre: 'Energética 500ml Tropical', categoria: 'Bebidas Energéticas', marca: 'PowerUp',    tenantId: 'tenant-001', pvpSugerido:  9800, costoVariable: 3900, pesoProfitPool: 0.04 },
  { id: 'sku-005', ean: '7701234000005', nombre: 'Energética 355ml Mora',     categoria: 'Bebidas Energéticas', marca: 'PowerUp',    tenantId: 'tenant-001', pvpSugerido:  6800, costoVariable: 2700, pesoProfitPool: 0.04 },
  // Jugos — FruttaViva
  { id: 'sku-006', ean: '7701234000006', nombre: 'Jugo Naranja 1L',           categoria: 'Jugos',               marca: 'FruttaViva', tenantId: 'tenant-001', pvpSugerido:  8200, costoVariable: 3400, pesoProfitPool: 0.04 },
  { id: 'sku-007', ean: '7701234000007', nombre: 'Jugo Manzana 1L',           categoria: 'Jugos',               marca: 'FruttaViva', tenantId: 'tenant-001', pvpSugerido:  8200, costoVariable: 3500, pesoProfitPool: 0.04 },
  { id: 'sku-008', ean: '7701234000008', nombre: 'Jugo Multifrutas 500ml',    categoria: 'Jugos',               marca: 'FruttaViva', tenantId: 'tenant-001', pvpSugerido:  4600, costoVariable: 1900, pesoProfitPool: 0.04 },
  { id: 'sku-009', ean: '7701234000009', nombre: 'Jugo Uva 1L',               categoria: 'Jugos',               marca: 'FruttaViva', tenantId: 'tenant-001', pvpSugerido:  8500, costoVariable: 3600, pesoProfitPool: 0.04 },
  { id: 'sku-010', ean: '7701234000010', nombre: 'Jugo Mango 500ml',          categoria: 'Jugos',               marca: 'FruttaViva', tenantId: 'tenant-001', pvpSugerido:  4800, costoVariable: 2000, pesoProfitPool: 0.04 },
  // Agua — AquaPura
  { id: 'sku-011', ean: '7701234000011', nombre: 'Agua Natural 300ml',        categoria: 'Agua',                marca: 'AquaPura',   tenantId: 'tenant-001', pvpSugerido:  1500, costoVariable:  500, pesoProfitPool: 0.04 },
  { id: 'sku-012', ean: '7701234000012', nombre: 'Agua Natural 600ml',        categoria: 'Agua',                marca: 'AquaPura',   tenantId: 'tenant-001', pvpSugerido:  2200, costoVariable:  800, pesoProfitPool: 0.04 },
  { id: 'sku-013', ean: '7701234000013', nombre: 'Agua Natural 1.5L',         categoria: 'Agua',                marca: 'AquaPura',   tenantId: 'tenant-001', pvpSugerido:  3800, costoVariable: 1400, pesoProfitPool: 0.04 },
  { id: 'sku-014', ean: '7701234000014', nombre: 'Agua Saborizada Limón 600ml',categoria: 'Agua',               marca: 'AquaPura',   tenantId: 'tenant-001', pvpSugerido:  2800, costoVariable: 1100, pesoProfitPool: 0.04 },
  { id: 'sku-015', ean: '7701234000015', nombre: 'Agua Saborizada Fresa 600ml',categoria: 'Agua',               marca: 'AquaPura',   tenantId: 'tenant-001', pvpSugerido:  2800, costoVariable: 1100, pesoProfitPool: 0.04 },
  // Hidratantes — SportPro
  { id: 'sku-016', ean: '7701234000016', nombre: 'Hidratante Limón 750ml',    categoria: 'Hidratantes',         marca: 'SportPro',   tenantId: 'tenant-001', pvpSugerido:  6500, costoVariable: 2800, pesoProfitPool: 0.04 },
  { id: 'sku-017', ean: '7701234000017', nombre: 'Hidratante Naranja 750ml',  categoria: 'Hidratantes',         marca: 'SportPro',   tenantId: 'tenant-001', pvpSugerido:  6500, costoVariable: 2800, pesoProfitPool: 0.04 },
  { id: 'sku-018', ean: '7701234000018', nombre: 'Hidratante Uva 500ml',      categoria: 'Hidratantes',         marca: 'SportPro',   tenantId: 'tenant-001', pvpSugerido:  4900, costoVariable: 2100, pesoProfitPool: 0.04 },
  // Tés — TeaLeaf
  { id: 'sku-019', ean: '7701234000019', nombre: 'Té Verde Limón 500ml',      categoria: 'Tés',                 marca: 'TeaLeaf',    tenantId: 'tenant-001', pvpSugerido:  3900, costoVariable: 1500, pesoProfitPool: 0.04 },
  { id: 'sku-020', ean: '7701234000020', nombre: 'Té Negro Durazno 500ml',    categoria: 'Tés',                 marca: 'TeaLeaf',    tenantId: 'tenant-001', pvpSugerido:  3900, costoVariable: 1500, pesoProfitPool: 0.04 },
  { id: 'sku-021', ean: '7701234000021', nombre: 'Té de Hierbas 500ml',       categoria: 'Tés',                 marca: 'TeaLeaf',    tenantId: 'tenant-001', pvpSugerido:  4200, costoVariable: 1700, pesoProfitPool: 0.04 },
  // Gaseosas — FizzUp
  { id: 'sku-022', ean: '7701234000022', nombre: 'Gaseosa Cola 350ml',        categoria: 'Gaseosas',            marca: 'FizzUp',     tenantId: 'tenant-001', pvpSugerido:  2500, costoVariable:  900, pesoProfitPool: 0.04 },
  { id: 'sku-023', ean: '7701234000023', nombre: 'Gaseosa Cola 1.5L',         categoria: 'Gaseosas',            marca: 'FizzUp',     tenantId: 'tenant-001', pvpSugerido:  5200, costoVariable: 1800, pesoProfitPool: 0.04 },
  { id: 'sku-024', ean: '7701234000024', nombre: 'Gaseosa Naranja 350ml',     categoria: 'Gaseosas',            marca: 'FizzUp',     tenantId: 'tenant-001', pvpSugerido:  2500, costoVariable:  900, pesoProfitPool: 0.04 },
  { id: 'sku-025', ean: '7701234000025', nombre: 'Gaseosa Lima-Limón 1.5L',   categoria: 'Gaseosas',            marca: 'FizzUp',     tenantId: 'tenant-001', pvpSugerido:  5200, costoVariable: 1800, pesoProfitPool: 0.04 },
]

// ─── Seed Competidores ────────────────────────────────────────────────────────

export const SEED_COMPETIDORES: MockCompetidor[] = [
  { id: 'comp-001', nombre: 'Red Bull',       pais: 'Austria',  tenantId: 'tenant-001' },
  { id: 'comp-002', nombre: 'Monster Energy', pais: 'USA',      tenantId: 'tenant-001' },
  { id: 'comp-003', nombre: 'Speed',          pais: 'Colombia', tenantId: 'tenant-001' },
  { id: 'comp-004', nombre: 'Hit',            pais: 'Colombia', tenantId: 'tenant-001' },
  { id: 'comp-005', nombre: 'Tutti Frutti',   pais: 'Colombia', tenantId: 'tenant-001' },
  { id: 'comp-006', nombre: 'Cristal',        pais: 'Colombia', tenantId: 'tenant-001' },
  { id: 'comp-007', nombre: 'Brisa',          pais: 'Colombia', tenantId: 'tenant-001' },
  { id: 'comp-008', nombre: 'Gatorade',       pais: 'USA',      tenantId: 'tenant-001' },
]

// ─── Seed R-001: Mapeo competidores ──────────────────────────────────────────
// Record<skuId, competidorId[]>

export const SEED_R001: Record<string, string[]> = {
  'sku-001': ['comp-001', 'comp-002', 'comp-003'],
  'sku-002': ['comp-001', 'comp-002', 'comp-003'],
  'sku-003': ['comp-001', 'comp-002'],
  'sku-004': ['comp-001', 'comp-003'],
  'sku-005': ['comp-004', 'comp-005'],
  'sku-006': ['comp-004', 'comp-005'],
  'sku-007': ['comp-004'],
  'sku-008': ['comp-006', 'comp-007'],
  'sku-009': ['comp-006', 'comp-007'],
  'sku-010': ['comp-008'],
}

// ─── Seed R-002a: Atributos por categoría (sin calificaciones) ───────────────

export const SEED_R002_ATRIBUTOS: MockCategoriaAtributos[] = [
  {
    categoria: 'Bebidas Energéticas',
    atributos: [
      { nombre: 'Sabor',           peso: 0.3000000000, orden: 1, calificacion: 4.0 },
      { nombre: 'Precio',          peso: 0.2500000000, orden: 2, calificacion: 4.0 },
      { nombre: 'Empaque',         peso: 0.2000000000, orden: 3, calificacion: 4.0 },
      { nombre: 'Disponibilidad',  peso: 0.1500000000, orden: 4, calificacion: 4.0 },
      { nombre: 'Marca',           peso: 0.1000000000, orden: 5, calificacion: 4.0 },
    ],
  },
  {
    categoria: 'Jugos',
    atributos: [
      { nombre: 'Sabor',              peso: 0.3500000000, orden: 1, calificacion: 4.0 },
      { nombre: 'Contenido de fruta', peso: 0.2500000000, orden: 2, calificacion: 4.0 },
      { nombre: 'Precio',             peso: 0.2000000000, orden: 3, calificacion: 4.0 },
      { nombre: 'Empaque',            peso: 0.1200000000, orden: 4, calificacion: 4.0 },
      { nombre: 'Disponibilidad',     peso: 0.0800000000, orden: 5, calificacion: 4.0 },
    ],
  },
  {
    categoria: 'Agua',
    atributos: [
      { nombre: 'Precio',          peso: 0.4000000000, orden: 1, calificacion: 4.0 },
      { nombre: 'Disponibilidad',  peso: 0.3000000000, orden: 2, calificacion: 4.0 },
      { nombre: 'Empaque',         peso: 0.1500000000, orden: 3, calificacion: 4.0 },
      { nombre: 'Pureza',          peso: 0.1000000000, orden: 4, calificacion: 4.0 },
      { nombre: 'Marca',           peso: 0.0500000000, orden: 5, calificacion: 4.0 },
    ],
  },
  {
    categoria: 'Hidratantes',
    atributos: [
      { nombre: 'Sabor',           peso: 0.3000000000, orden: 1, calificacion: 4.0 },
      { nombre: 'Precio',          peso: 0.2500000000, orden: 2, calificacion: 4.0 },
      { nombre: 'Electrolitos',    peso: 0.2500000000, orden: 3, calificacion: 4.0 },
      { nombre: 'Disponibilidad',  peso: 0.1200000000, orden: 4, calificacion: 4.0 },
      { nombre: 'Marca',           peso: 0.0800000000, orden: 5, calificacion: 4.0 },
    ],
  },
  {
    categoria: 'Tés',
    atributos: [
      { nombre: 'Sabor',           peso: 0.3500000000, orden: 1, calificacion: 4.0 },
      { nombre: 'Precio',          peso: 0.2500000000, orden: 2, calificacion: 4.0 },
      { nombre: 'Variedad',        peso: 0.1500000000, orden: 3, calificacion: 4.0 },
      { nombre: 'Empaque',         peso: 0.1500000000, orden: 4, calificacion: 4.0 },
      { nombre: 'Disponibilidad',  peso: 0.1000000000, orden: 5, calificacion: 4.0 },
    ],
  },
  {
    categoria: 'Gaseosas',
    atributos: [
      { nombre: 'Sabor',           peso: 0.3000000000, orden: 1, calificacion: 4.0 },
      { nombre: 'Precio',          peso: 0.3000000000, orden: 2, calificacion: 4.0 },
      { nombre: 'Disponibilidad',  peso: 0.2000000000, orden: 3, calificacion: 4.0 },
      { nombre: 'Empaque',         peso: 0.1000000000, orden: 4, calificacion: 4.0 },
      { nombre: 'Marca',           peso: 0.1000000000, orden: 5, calificacion: 4.0 },
    ],
  },
]

// ─── Seed R-002b: Calificaciones por SKU × atributo × {propio, competidor} ───

function buildDefaultCalificaciones(): MockCalificacion[] {
  const out: MockCalificacion[] = []
  for (const sku of SEED_SKUS) {
    const catAttrs = SEED_R002_ATRIBUTOS.find(c => c.categoria === sku.categoria)
    if (!catAttrs) continue
    const competidoresAsignados = SEED_R001[sku.id] ?? []
    for (const atr of catAttrs.atributos) {
      const califsComp: Record<string, number> = {}
      for (const compId of competidoresAsignados) {
        // semilla simple: valores en [3.0, 4.5] con 2 decimales
        califsComp[compId] = Math.round((3 + Math.random() * 1.5) * 100) / 100
      }
      out.push({
        skuId: sku.id,
        atributo: atr.nombre,
        calificacionPropia: Math.round((3.5 + Math.random() * 1.2) * 100) / 100,
        calificacionesCompetidor: califsComp,
      })
    }
  }
  return out
}

export const SEED_R002_CALIFICACIONES: MockCalificacion[] = buildDefaultCalificaciones()

// ─── Seed R-004: Elasticidades (sin confianza, sin R²) ────────────────────────

export const SEED_R004: MockElasticidad[] = [
  { skuId: 'sku-001', coeficiente: -1.82 },
  { skuId: 'sku-002', coeficiente: -1.65 },
  { skuId: 'sku-003', coeficiente: -1.45 },
  { skuId: 'sku-004', coeficiente: -1.78 },
  { skuId: 'sku-005', coeficiente: -2.10 },
  { skuId: 'sku-006', coeficiente: -2.05 },
  { skuId: 'sku-007', coeficiente: -1.95 },
  { skuId: 'sku-008', coeficiente: -0.85 },
  { skuId: 'sku-009', coeficiente: -0.78 },
  { skuId: 'sku-010', coeficiente: -1.55 },
]

// ─── Seed R-005/R-006: Portafolio (IVA) ──────────────────────────────────────

export const SEED_PORTAFOLIO: MockPortafolio = {
  iva: 0.19,
}

// ─── Seed R-007: Canales × Categorías (sin IVA) ──────────────────────────────

export const SEED_R007: MockCanalesMargenes = {
  iva: 0.19,
  canales: [
    { nombre: 'Mayorista', margen: 0.80 },
    { nombre: 'Retail', margen: 0.65 },
    { nombre: 'TAT', margen: 0.85 },
  ],
}

// ─── Seed R-008: Umbrales de alerta ──────────────────────────────────────────

export const SEED_R008: MockUmbrales = {
  umbralSuperior: 0.05,
  umbralInferior: 0.05,
}

// ─── Seed R-010: Retailers ───────────────────────────────────────────────────

export const SEED_R010: MockRetailer[] = [
  { id: 'ret-001', nombre: 'Éxito',     activo: true,  tenantId: 'tenant-001' },
  { id: 'ret-002', nombre: 'Carulla',   activo: true,  tenantId: 'tenant-001' },
  { id: 'ret-003', nombre: 'Olímpica',  activo: true,  tenantId: 'tenant-001' },
  { id: 'ret-004', nombre: 'D1',        activo: true,  tenantId: 'tenant-001' },
  { id: 'ret-005', nombre: 'Ara',       activo: true,  tenantId: 'tenant-001' },
  { id: 'ret-006', nombre: 'Jumbo',     activo: true,  tenantId: 'tenant-001' },
  { id: 'ret-007', nombre: 'Makro',     activo: false, tenantId: 'tenant-001' },
]

// ─── Seed R-005: Config estructura costos ───────────────────────────────────

export const SEED_R005: MockColConfig = {
  iva: 0.19,
  tipoEstructura: 'costo_variable',
}

// ─── Seed R-006: Config estructura SKUs/PVP ────────────────────────────────

export const SEED_R006: MockColConfig = {
  iva: 0.19,
  tipoEstructura: 'pvp_sugerido',
}

// ─── Importaciones de portafolio ─────────────────────────────────────────────

export interface MockImportRecord {
  id: string
  fecha: string
  archivo: string
  totalSkus: number
  advertencias: number
  errores: string[]
  estado: 'exitoso' | 'con_advertencias' | 'fallido'
}

export const SEED_IMPORTACIONES: MockImportRecord[] = [
  {
    id: 'imp-001',
    fecha: new Date(Date.now() - 30 * 86400_000).toISOString(),
    archivo: 'portafolio-congrupo-v1.xlsx',
    totalSkus: 20,
    advertencias: 0,
    errores: [],
    estado: 'exitoso',
  },
  {
    id: 'imp-002',
    fecha: new Date(Date.now() - 15 * 86400_000).toISOString(),
    archivo: 'portafolio-congrupo-v2.xlsx',
    totalSkus: 23,
    advertencias: 2,
    errores: [
      'Fila 8: Peso Profit Pool fuera de rango (1.5%) — se normalizó a 1.0%',
      'Fila 15: Categoría "Bebidas Deportivas" no reconocida — asignada a Hidratantes',
    ],
    estado: 'con_advertencias',
  },
  {
    id: 'imp-003',
    fecha: new Date(Date.now() - 3 * 86400_000).toISOString(),
    archivo: 'portafolio-congrupo-oct2025.xlsx',
    totalSkus: 25,
    advertencias: 0,
    errores: [],
    estado: 'exitoso',
  },
]

// ─── Seed R-009: Peso profit pool por SKU ───────────────────────────────────

export const SEED_R009: MockPesoItem[] = [
  { skuId: 'sku-001', peso: 0.15 },
  { skuId: 'sku-002', peso: 0.12 },
  { skuId: 'sku-003', peso: 0.08 },
  { skuId: 'sku-004', peso: 0.10 },
  { skuId: 'sku-005', peso: 0.12 },
  { skuId: 'sku-006', peso: 0.10 },
  { skuId: 'sku-007', peso: 0.08 },
  { skuId: 'sku-008', peso: 0.10 },
  { skuId: 'sku-009', peso: 0.10 },
  { skuId: 'sku-010', peso: 0.05 },
]
