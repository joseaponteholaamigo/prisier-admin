import { useState, useRef, useCallback, useMemo, useEffect, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Lock, Plus, Trash2, Save, AlertTriangle,
  Download, Upload, ChevronDown, ChevronUp, Search,
} from 'lucide-react'
import api from '../lib/api'
import type {
  TenantListItem,
  CompetidoresData,
  CompetidorItem,
  CategoriaAtributos,
  AtributoCategoria,
  SkuCalificaciones,
  ElasticidadItem,
  PortafolioData,
  PortafolioItem,
  CanalesMargenes,
  CanalSimple,
  Umbrales,
  RetailerItem,
  ImportacionRecord,
} from '../lib/types'

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'portafolio',     label: 'Portafolio' },
  { id: 'importaciones',  label: 'Importaciones' },
  { id: 'atributos',      label: 'Atributos' },
  { id: 'calificaciones', label: 'Calificaciones' },
  { id: 'elasticidad',    label: 'Elasticidad' },
  { id: 'canales',        label: 'Canales' },
  { id: 'umbrales',       label: 'Umbrales' },
  { id: 'retailers',      label: 'Retailers' },
]

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SaveBar({ onSave, saving, dirty }: { onSave: () => void; saving: boolean; dirty: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-p-border mt-6">
      {dirty && (
        <span className="text-xs text-p-yellow flex items-center gap-1">
          <AlertTriangle size={13} /> Cambios sin guardar
        </span>
      )}
      <button onClick={onSave} disabled={saving || !dirty} className="btn-primary flex items-center gap-2 disabled:opacity-40">
        <Save size={15} />
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}

function SoloPrisierBadge() {
  return (
    <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>
      <Lock size={10} className="mr-1" /> Solo Prisier
    </span>
  )
}

// ─── Filtros estándar para tablas de SKUs ────────────────────────────────────

const SELECT_CHEVRON = "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[center_right_0.5rem]"
const INPUT_BASE = 'rounded-lg border border-p-border bg-white text-sm text-p-dark focus:outline-none focus:ring-2 focus:ring-p-lime/40 focus:border-p-lime transition-colors'

interface SkuTableFiltersProps {
  categorias: string[]
  filterCategoria: string
  filterSku: string
  onChange: (categoria: string, sku: string) => void
}

function SkuTableFilters({ categorias, filterCategoria, filterSku, onChange }: SkuTableFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={filterCategoria}
        onChange={e => onChange(e.target.value, filterSku)}
        className={`${INPUT_BASE} ${SELECT_CHEVRON} px-3 py-1.5 appearance-none pr-8 min-w-44`}
      >
        <option value="">Todas las categorías</option>
        {categorias.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar SKU o nombre…"
          value={filterSku}
          onChange={e => onChange(filterCategoria, e.target.value)}
          className={`${INPUT_BASE} pl-8 pr-4 py-1.5 min-w-52`}
        />
      </div>
      {(filterCategoria || filterSku) && (
        <button
          onClick={() => onChange('', '')}
          className="text-xs text-p-muted hover:text-p-dark transition-colors underline underline-offset-2"
        >
          Limpiar
        </button>
      )}
    </div>
  )
}

// ─── Multi-select de competidores por SKU ────────────────────────────────────

interface CompetidoresCellProps {
  skuId: string
  asignados: string[]
  competidores: CompetidorItem[]
  onChange: (skuId: string, ids: string[]) => void
}

function CompetidoresCell({ skuId, asignados, competidores, onChange }: CompetidoresCellProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const VISIBLE = 2
  const MAX_CHARS = 10

  const asignadosItems = asignados
    .map(id => competidores.find(c => c.id === id))
    .filter((c): c is CompetidorItem => !!c)

  const visible = asignadosItems.slice(0, VISIBLE)
  const extra = asignadosItems.length - VISIBLE

  const filtrados = competidores.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase())
  )
  const asignadosFiltrados = filtrados.filter(c => asignados.includes(c.id))
  const disponiblesFiltrados = filtrados.filter(c => !asignados.includes(c.id))

  const toggle = (id: string) => {
    if (asignados.includes(id)) onChange(skuId, asignados.filter(a => a !== id))
    else { onChange(skuId, [...asignados, id]); setSearch('') }
  }

  const truncate = (s: string) => s.length > MAX_CHARS ? s.slice(0, MAX_CHARS) + '…' : s

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1 flex-wrap">
        {asignados.length === 0 && (
          <span className="text-xs text-p-muted">Sin asignar</span>
        )}
        {visible.map(c => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                       bg-p-lime-bg border border-p-lime-border text-p-dark max-w-[160px]"
          >
            <span className="truncate">{truncate(c.nombre)}</span>
            <button
              onClick={e => { e.stopPropagation(); toggle(c.id) }}
              className="hover:text-p-red leading-none shrink-0"
            >×</button>
          </span>
        ))}
        {extra > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                           bg-p-border text-p-gray font-medium cursor-default">
            +{extra}
          </span>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-p-border
                     text-p-gray hover:border-p-lime hover:text-p-lime transition-colors text-sm font-bold"
        >
          +
        </button>
      </div>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 w-56 bg-white border border-p-border
                        rounded-lg shadow-lg">
          <div className="p-2 border-b border-p-border">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar competidor…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-p-border
                           focus:outline-none focus:ring-2 focus:ring-p-lime/40 focus:border-p-lime"
              />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {asignadosFiltrados.length > 0 && (
              <>
                <li className="px-3 pt-2 pb-1">
                  <span className="text-[10px] font-semibold text-p-muted uppercase tracking-wider">
                    Vinculados
                  </span>
                </li>
                {asignadosFiltrados.map(c => (
                  <li key={c.id}>
                    <button
                      onClick={() => toggle(c.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-p-dark hover:bg-red-50
                                 transition-colors flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-p-lime flex items-center justify-center shrink-0">
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                        {c.nombre}
                      </span>
                      <span className="text-p-muted group-hover:text-p-red transition-colors">Quitar</span>
                    </button>
                  </li>
                ))}
              </>
            )}
            {disponiblesFiltrados.length > 0 && (
              <>
                <li className={`px-3 pb-1 ${asignadosFiltrados.length > 0 ? 'pt-2 border-t border-p-border mt-1' : 'pt-2'}`}>
                  <span className="text-[10px] font-semibold text-p-muted uppercase tracking-wider">
                    Disponibles
                  </span>
                </li>
                {disponiblesFiltrados.map(c => (
                  <li key={c.id}>
                    <button
                      onClick={() => toggle(c.id)}
                      className="w-full text-left px-3 py-1.5 text-xs text-p-dark hover:bg-p-lime-bg
                                 transition-colors flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full border border-p-border shrink-0" />
                        {c.nombre}
                      </span>
                      <span className="text-p-muted">{c.pais}</span>
                    </button>
                  </li>
                ))}
              </>
            )}
            {filtrados.length === 0 && (
              <li className="px-3 py-3 text-xs text-p-muted text-center">Sin resultados</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ─── PortafolioTab (R-005/R-006 unificado + IVA + Profit Pool) ───────────────

const PAGE_SIZE = 10

function PortafolioTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const [ivaEdit, setIvaEdit] = useState<number | null>(null)
  const [editedPesos, setEditedPesos] = useState<Record<string, number>>({})
  const [mapeoEdit, setMapeoEdit] = useState<Record<string, string[]> | null>(null)
  const [filterSku, setFilterSku] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [page, setPage] = useState(1)

  const { data: portafolioData, isLoading } = useQuery<PortafolioData | null>({
    queryKey: ['reglas-portafolio', tenantId],
    queryFn: () =>
      api.get<PortafolioData>(`reglas/portafolio?tenantId=${tenantId}`)
        .then(r => r.data)
        .catch(() => null),
  })

  const { data: competidoresData } = useQuery<CompetidoresData | null>({
    queryKey: ['reglas-r001', tenantId],
    queryFn: () =>
      api.get<CompetidoresData>(`reglas/competidores?tenantId=${tenantId}`)
        .then(r => r.data)
        .catch(() => null),
  })

  const currentIva = ivaEdit ?? portafolioData?.iva ?? 0.19
  const items: PortafolioItem[] = useMemo(() => portafolioData?.items ?? [], [portafolioData])
  const competidores: CompetidorItem[] = competidoresData?.competidores ?? []
  const currentMapeo = mapeoEdit ?? competidoresData?.mapeo ?? {}
  const getPeso = (item: PortafolioItem) =>
    editedPesos[item.skuId] !== undefined ? editedPesos[item.skuId] : item.pesoProfitPool
  const sumaPesos = items.reduce((s, i) => s + getPeso(i), 0)
  const pesoError = items.length > 0 && Math.abs(sumaPesos - 1.0) > 0.01
  const isDirty = ivaEdit !== null || Object.keys(editedPesos).length > 0 || mapeoEdit !== null

  const categorias = useMemo(() =>
    Array.from(new Set(items.map(i => i.categoria))).sort(),
    [items],
  )

  const filteredItems = useMemo(() => {
    const skuLower = filterSku.toLowerCase()
    return items.filter(item => {
      const matchSku = !skuLower ||
        item.ean.toLowerCase().includes(skuLower) ||
        item.nombre.toLowerCase().includes(skuLower)
      const matchCat = !filterCategoria || item.categoria === filterCategoria
      return matchSku && matchCat
    })
  }, [items, filterSku, filterCategoria])

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const mutation = useMutation({
    mutationFn: () => Promise.all([
      api.put(`reglas/portafolio?tenantId=${tenantId}`, {
        iva: currentIva,
        items: items.map(item => ({ ...item, pesoProfitPool: getPeso(item) })),
      }),
      mapeoEdit !== null
        ? api.put(`reglas/competidores?tenantId=${tenantId}`, { mapeo: currentMapeo })
        : Promise.resolve(null),
    ]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-portafolio', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['reglas-r001', tenantId] })

      setIvaEdit(null)
      setEditedPesos({})
      setMapeoEdit(null)
    },
  })

  if (isLoading) return <Spinner />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Plantilla con formato fijo. Columnas: SKU, Nombre, Marca, Categoría, PVP Sugerido, Costo Variable, Peso Profit Pool (%).
      </p>

      {/* IVA */}
      <div className="flex items-center gap-4 mb-5">
        <div className="card flex items-center gap-3 px-4 py-2.5">
          <label className="text-sm text-p-gray font-medium whitespace-nowrap">IVA nacional</label>
          <input
            type="number" min={0} max={100} step={0.5}
            value={Math.round(currentIva * 100)}
            onChange={e => setIvaEdit(Number(e.target.value) / 100)}
            className="form-input py-1 text-center w-20"
          />
          <span className="text-sm text-p-gray">%</span>
        </div>
      </div>

      {/* Items table */}
      {items.length > 0 && (
        <div className="card mt-5">
          {pesoError && (
            <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-lg border border-p-yellow bg-p-yellow/10 text-p-yellow text-sm">
              <AlertTriangle size={15} />
              Los pesos suman {(sumaPesos * 100).toFixed(1)}% — deben ser exactamente 100%.
            </div>
          )}

          {/* Filters */}
          <div className="mb-4">
            <SkuTableFilters
              categorias={categorias}
              filterCategoria={filterCategoria}
              filterSku={filterSku}
              onChange={(cat, sku) => { setFilterCategoria(cat); setFilterSku(sku); setPage(1) }}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th className="text-left">SKU</th>
                  <th className="text-left">Nombre</th>
                  <th className="text-left">Marca</th>
                  <th className="text-left">Categoría</th>
                  <th className="text-right">PVP Sugerido</th>
                  <th className="text-right">Costo Variable</th>
                  <th className="text-center">Peso (%)</th>
                  <th className="text-left w-36">Distribución</th>
                  <th className="text-left min-w-48">Competidores</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(item => {
                  const peso = getPeso(item)
                  return (
                    <tr key={item.skuId}>
                      <td className="text-xs text-p-muted font-mono">{item.ean}</td>
                      <td className="text-sm font-medium text-p-dark">{item.nombre}</td>
                      <td className="text-xs text-p-gray">{item.marca}</td>
                      <td className="text-xs text-p-gray">{item.categoria}</td>
                      <td className="text-right text-sm text-p-dark">${item.pvpSugerido.toLocaleString('es-CO')}</td>
                      <td className="text-right text-sm text-p-gray">${item.costoVariable.toLocaleString('es-CO')}</td>
                      <td className="text-center">
                        <input
                          type="number" min={0} max={100} step={0.1}
                          value={Math.round(peso * 1000) / 10}
                          onChange={e => setEditedPesos(prev => ({ ...prev, [item.skuId]: Number(e.target.value) / 100 }))}
                          className="form-input py-1 text-sm text-center w-20 mx-auto"
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-p-border rounded-full overflow-hidden">
                            <div className="h-full bg-p-lime rounded-full transition-all"
                              style={{ width: `${Math.min(peso * 100 / 0.3, 100)}%` }} />
                          </div>
                          <span className="text-xs text-p-gray w-10 text-right">{(peso * 100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>
                        <CompetidoresCell
                          skuId={item.skuId}
                          asignados={currentMapeo[item.skuId] ?? []}
                          competidores={competidores}
                          onChange={(skuId, ids) =>
                            setMapeoEdit(prev => ({ ...(prev ?? currentMapeo), [skuId]: ids }))
                          }
                        />
                      </td>
                    </tr>
                  )
                })}
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center text-sm text-p-muted py-6">
                      Sin resultados para los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} className="text-sm font-semibold text-p-dark">Total global</td>
                  <td className={`text-center text-sm font-bold ${pesoError ? 'text-p-red' : 'text-p-lime'}`}>
                    {(sumaPesos * 100).toFixed(1)}%
                  </td>
                  <td />
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-p-border">
            <span className="text-sm text-p-muted">
              {safePage} / {totalPages} — {filteredItems.length} producto{filteredItems.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="text-sm text-p-gray hover:text-p-dark disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="text-sm font-semibold text-p-dark hover:text-p-lime disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 && !isLoading && (
        <div className="card mt-5 text-center py-8 text-p-gray text-sm">
          Sin datos — descarga la plantilla, complétala y cárgala aquí.
        </div>
      )}

      <SaveBar onSave={() => mutation.mutate()} saving={mutation.isPending} dirty={isDirty && !pesoError} />
    </div>
  )
}

// ─── CompetidoresTab (R-001) ──────────────────────────────────────────────────

function CompetidoresTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery<CompetidoresData>({
    queryKey: ['reglas-r001', tenantId],
    queryFn: () => api.get<CompetidoresData>(`reglas/competidores?tenantId=${tenantId}`).then(r => r.data),
  })

  const [mapeo, setMapeo] = useState<Record<string, string[]> | null>(null)
  const [filterCat, setFilterCat] = useState('')
  const [filterSku, setFilterSku] = useState('')
  const dirty = mapeo !== null
  const currentMapeo = mapeo ?? data?.mapeo ?? {}

  const categorias = [...new Set(data?.skus.map(s => s.categoria) ?? [])].sort()
  const filteredSkus = (data?.skus ?? []).filter(sku =>
    (!filterCat || sku.categoria === filterCat) &&
    (!filterSku || sku.nombre.toLowerCase().includes(filterSku.toLowerCase()) || sku.ean.toLowerCase().includes(filterSku.toLowerCase()))
  )

  const toggle = (skuId: string, compId: string) => {
    const current = currentMapeo[skuId] ?? []
    const updated = current.includes(compId)
      ? current.filter(id => id !== compId)
      : [...current, compId]
    setMapeo({ ...currentMapeo, [skuId]: updated })
  }

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/competidores?tenantId=${tenantId}`, { mapeo: currentMapeo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-r001', tenantId] })

      setMapeo(null)
    },
  })

  if (isLoading || !data) return <Spinner />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Selecciona qué competidores se comparan con cada SKU. Solo se comparan precios con los competidores asignados.
      </p>

      {/* Filters */}
      <div className="mb-4">
        <SkuTableFilters
          categorias={categorias}
          filterCategoria={filterCat}
          filterSku={filterSku}
          onChange={(cat, sku) => { setFilterCat(cat); setFilterSku(sku) }}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="text-left">SKU</th>
              <th className="text-left">Categoría</th>
              {data.competidores.map(c => (
                <th key={c.id} className="text-center text-xs" style={{ minWidth: 90 }}>{c.nombre}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSkus.map(sku => (
              <tr key={sku.id}>
                <td className="font-medium text-p-dark text-sm">{sku.nombre}</td>
                <td className="text-xs text-p-gray">{sku.categoria}</td>
                {data.competidores.map(comp => {
                  const checked = (currentMapeo[sku.id] ?? []).includes(comp.id)
                  return (
                    <td key={comp.id} className="text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(sku.id, comp.id)}
                        className="w-4 h-4 accent-p-lime cursor-pointer"
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
            {filteredSkus.length === 0 && (
              <tr>
                <td colSpan={2 + data.competidores.length} className="text-center py-6 text-p-gray text-sm">
                  Sin resultados para los filtros aplicados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <SaveBar onSave={() => mutation.mutate()} saving={mutation.isPending} dirty={dirty} />
    </div>
  )
}

// ─── Combobox con filtro de texto ────────────────────────────────────────────

interface SearchableSelectProps {
  options: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

function SearchableSelect({ options, value, onChange, placeholder = 'Seleccionar…' }: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))

  const select = (v: string) => {
    onChange(v)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={ref} className="relative min-w-56">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`${INPUT_BASE} w-full flex items-center justify-between px-3 py-1.5 gap-2`}
      >
        <span className={value ? 'text-p-dark' : 'text-p-muted'}>{value || placeholder}</span>
        <ChevronDown size={14} className={`text-p-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 w-full min-w-56 bg-white border border-p-border rounded-lg shadow-lg">
          <div className="p-2 border-b border-p-border">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-p-muted pointer-events-none" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar categoría…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-p-border
                           focus:outline-none focus:ring-2 focus:ring-p-lime/40 focus:border-p-lime"
              />
            </div>
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-xs text-p-muted text-center">Sin resultados</li>
            )}
            {filtered.map(o => (
              <li key={o}>
                <button
                  onClick={() => select(o)}
                  className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                    o === value
                      ? 'bg-p-lime text-p-bg font-medium'
                      : 'text-p-dark hover:bg-p-lime-bg'
                  }`}
                >
                  {o}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── ImportacionesTab ─────────────────────────────────────────────────────────

function ImportacionesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: historial = [], isLoading } = useQuery<ImportacionRecord[]>({
    queryKey: ['reglas-importaciones', tenantId],
    queryFn: () => api.get<ImportacionRecord[]>(`reglas/portafolio/importaciones?tenantId=${tenantId}`).then(r => r.data),
  })

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get(`reglas/portafolio/plantilla?tenantId=${tenantId}`, { responseType: 'blob' })
      downloadBlob(res.data as Blob, 'plantilla-portafolio.xlsx')
    } catch { /* silent */ }
  }

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.xlsx') || file.size > 5 * 1024 * 1024) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await api.post(`reglas/portafolio/upload?tenantId=${tenantId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      queryClient.invalidateQueries({ queryKey: ['reglas-importaciones', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['reglas-portafolio', tenantId] })
    } catch { /* silent */ } finally {
      setUploading(false)
    }
  }, [tenantId, queryClient])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const estadoBadge = (estado: ImportacionRecord['estado']) => {
    if (estado === 'exitoso') return <span className="badge badge-green">Exitoso</span>
    if (estado === 'con_advertencias') return <span className="badge badge-yellow">Con advertencias</span>
    return <span className="badge badge-red">Fallido</span>
  }

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Carga el portafolio de productos desde la plantilla Excel. Cada importación queda registrada en el historial.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <button onClick={handleDownloadTemplate} className="btn-secondary flex items-center gap-2">
          <Download size={15} /> Descargar plantilla
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragOver ? 'border-p-lime bg-p-lime/10' : 'border-p-border hover:border-p-muted hover:bg-white/5'}`}
      >
        <input ref={inputRef} type="file" accept=".xlsx" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-p-lime border-t-transparent" />
            <p className="text-sm text-p-muted">Procesando archivo…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className={`w-8 h-8 ${isDragOver ? 'text-p-lime' : 'text-p-muted'}`} />
            <div>
              <p className="text-sm text-p-dark">Arrastra la plantilla .xlsx aquí</p>
              <p className="text-xs text-p-muted mt-1">o haz clic para seleccionar (máx. 5MB)</p>
            </div>
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="card mt-6">
        <h3 className="text-sm font-semibold text-p-dark mb-4">Historial de importaciones</h3>
        {isLoading ? <Spinner /> : historial.length === 0 ? (
          <p className="text-sm text-p-muted text-center py-6">Sin importaciones registradas.</p>
        ) : (
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Fecha</th>
                <th className="text-left">Archivo</th>
                <th className="text-center">SKUs</th>
                <th className="text-center">Advertencias</th>
                <th className="text-center">Estado</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {historial.map(imp => (
                <Fragment key={imp.id}>
                  <tr>
                    <td className="text-sm text-p-dark whitespace-nowrap">
                      {new Date(imp.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="text-sm text-p-gray font-mono">{imp.archivo}</td>
                    <td className="text-center text-sm font-medium text-p-dark">{imp.totalSkus}</td>
                    <td className="text-center">
                      {imp.advertencias > 0
                        ? <span className="text-sm text-p-yellow font-medium">{imp.advertencias}</span>
                        : <span className="text-sm text-p-muted">—</span>}
                    </td>
                    <td className="text-center">{estadoBadge(imp.estado)}</td>
                    <td className="text-center">
                      {imp.errores.length > 0 && (
                        <button
                          onClick={() => setExpanded(expanded === imp.id ? null : imp.id)}
                          className="text-p-muted hover:text-p-dark transition-colors"
                        >
                          {expanded === imp.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === imp.id && (
                    <tr>
                      <td colSpan={6} className="py-0 px-4 bg-p-bg/40">
                        <div className="py-3">
                          <p className="text-[10px] font-semibold text-p-muted uppercase tracking-wider mb-2">Detalle</p>
                          <ul className="space-y-1">
                            {imp.errores.map((e, i) => (
                              <li key={i} className="text-xs text-p-yellow flex items-start gap-2">
                                <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                {e}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── AtributosTab (R-002 — parte a: atributos + pesos) ───────────────────────

function AtributosTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const { data = [], isLoading } = useQuery<CategoriaAtributos[]>({
    queryKey: ['reglas-atributos', tenantId],
    queryFn: () => api.get<CategoriaAtributos[]>(`reglas/atributos?tenantId=${tenantId}`).then(r => r.data),
  })

  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [atributos, setAtributos] = useState<AtributoCategoria[] | null>(null)
  const dirty = atributos !== null

  const categoria = selectedCat ?? data[0]?.categoria ?? ''
  const currentAtributos = atributos ?? data.find(d => d.categoria === categoria)?.atributos ?? []

  const selectCat = (cat: string) => {
    setSelectedCat(cat)
    setAtributos(null)
  }

  const updateAtributo = (idx: number, field: keyof AtributoCategoria, value: string | number) => {
    const copy = currentAtributos.map((a, i) => i === idx ? { ...a, [field]: value } : a)
    setAtributos(copy)
  }

  const sumaPesos = currentAtributos.reduce((acc, a) => acc + Number(a.peso), 0)
  const pesoError = Math.abs(sumaPesos - 1.0) > 0.01

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/atributos?tenantId=${tenantId}`, { categoria, atributos: currentAtributos }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-atributos', tenantId] })

      setAtributos(null)
    },
  })

  const categorias = data.map(d => d.categoria)

  if (isLoading) return <Spinner />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Configura los 5 atributos de valor percibido por categoría. Los pesos deben sumar 100% (precisión 10 decimales).
      </p>

      {/* Selector de categoría */}
      <div className="mb-4">
        <SearchableSelect
          options={categorias}
          value={categoria}
          onChange={selectCat}
          placeholder="Selecciona una categoría…"
        />
      </div>

      {/* Tabla de atributos */}
      {currentAtributos.length > 0 ? (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-p-dark">{categoria}</span>
            <div className="flex items-center gap-3">
              {pesoError && (
                <span className="text-xs text-p-red flex items-center gap-1">
                  <AlertTriangle size={13} /> Suman {(sumaPesos * 100).toFixed(2)}% (deben ser 100%)
                </span>
              )}
              <span className={`text-lg font-bold ${pesoError ? 'text-p-red' : 'text-p-lime'}`}>
                {(sumaPesos * 100).toFixed(2)}%
              </span>
            </div>
          </div>

          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left w-6">#</th>
                <th className="text-left">Atributo</th>
                <th className="text-center w-36">Peso (%)</th>
              </tr>
            </thead>
            <tbody>
              {currentAtributos.map((a, idx) => (
                <tr key={idx}>
                  <td className="text-xs text-p-muted">{idx + 1}</td>
                  <td>
                    <input
                      value={a.nombre}
                      onChange={e => updateAtributo(idx, 'nombre', e.target.value)}
                      className="form-input py-1 text-sm w-full"
                    />
                  </td>
                  <td className="text-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={a.peso === 0 ? '' : String(a.peso)}
                      onChange={e => {
                        const v = parseFloat(e.target.value)
                        updateAtributo(idx, 'peso', isNaN(v) ? 0 : Math.min(1, Math.max(0, v)))
                      }}
                      placeholder="0.2"
                      className="form-input py-1 text-sm text-center w-28 mx-auto font-mono"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} />
                <td className={`text-center text-sm font-bold ${pesoError ? 'text-p-red' : 'text-p-lime'}`}>
                  {(sumaPesos * 100).toFixed(2)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 text-sm text-p-muted border border-dashed border-p-border rounded-xl">
          Selecciona una categoría para ver sus atributos
        </div>
      )}

      <SaveBar onSave={() => mutation.mutate()} saving={mutation.isPending} dirty={dirty && !pesoError} />
    </div>
  )
}

// ─── CalificacionesTab (R-002/R-003 — parte b: SKU × atributo) ───────────────

function CalificacionesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null)
  const [modo, setModo] = useState<'propio' | 'competidor'>('propio')
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null)
  const [cals, setCals] = useState<Record<string, number> | null>(null)
  const dirty = cals !== null

  const { data: r001 } = useQuery<CompetidoresData>({
    queryKey: ['reglas-r001', tenantId],
    queryFn: () => api.get<CompetidoresData>(`reglas/competidores?tenantId=${tenantId}`).then(r => r.data),
  })

  const skus = r001?.skus ?? []
  const currentSku = skus.find(s => s.id === selectedSkuId) ?? skus[0] ?? null
  const currentSkuId = currentSku?.id ?? null

  const competidoresDelSku = currentSkuId
    ? (r001?.competidores ?? []).filter(c =>
        (r001?.mapeo[currentSkuId] ?? []).includes(c.id)
      )
    : []

  const { data: skuCals, isLoading } = useQuery<SkuCalificaciones | null>({
    queryKey: ['reglas-calificaciones', tenantId, currentSkuId],
    queryFn: () =>
      currentSkuId
        ? api.get<SkuCalificaciones>(`reglas/calificaciones?tenantId=${tenantId}&skuId=${currentSkuId}`)
            .then(r => r.data)
            .catch(() => null)
        : Promise.resolve(null),
    enabled: !!currentSkuId,
  })

  const atributos = skuCals?.atributos ?? []

  const getCurrentCals = () => {
    if (cals) return cals
    const base: Record<string, number> = {}
    atributos.forEach(a => {
      base[a.nombre] = modo === 'propio'
        ? a.calificacionPropia
        : (selectedCompId ? (a.calificacionesCompetidor[selectedCompId] ?? 0) : 0)
    })
    return base
  }

  const currentCals = getCurrentCals()
  const vpActual = atributos.reduce((s, a) => s + a.peso * (currentCals[a.nombre] ?? 0), 0)

  const updateCal = (atributo: string, val: number) => {
    setCals({ ...getCurrentCals(), [atributo]: val })
  }

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/calificaciones?tenantId=${tenantId}`, {
      skuId: currentSkuId,
      modo,
      competidorId: modo === 'competidor' ? selectedCompId : null,
      calificaciones: currentCals,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-calificaciones', tenantId, currentSkuId] })
      setCals(null)
    },
  })

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Calificación por SKU × atributo. Configura tanto para el propio producto como para cada competidor asignado. Precisión 10 decimales.
      </p>

      {/* SKU selector */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <select
          value={currentSkuId ?? ''}
          onChange={e => { setSelectedSkuId(e.target.value || null); setCals(null) }}
          className="form-input py-1.5 text-sm w-64"
        >
          {skus.length === 0 && <option value="">Sin SKUs disponibles</option>}
          {skus.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.categoria})</option>)}
        </select>

        {/* Propio / Competidor toggle */}
        <div className="flex rounded-lg border border-p-border overflow-hidden">
          {(['propio', 'competidor'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setModo(m); setCals(null) }}
              className={`px-3 py-1.5 text-sm font-medium transition-colors capitalize ${
                modo === m ? 'bg-p-lime text-p-bg' : 'text-p-gray hover:text-p-dark'
              }`}
            >
              {m === 'propio' ? 'Propio' : 'Competidor'}
            </button>
          ))}
        </div>

        {modo === 'competidor' && (
          <select
            value={selectedCompId ?? ''}
            onChange={e => { setSelectedCompId(e.target.value || null); setCals(null) }}
            className="form-input py-1.5 text-sm w-44"
          >
            <option value="">Selecciona competidor…</option>
            {competidoresDelSku.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}
      </div>

      {isLoading ? <Spinner /> : atributos.length > 0 ? (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-p-gray">VP calculado ({modo === 'propio' ? 'propio' : selectedCompId ? competidoresDelSku.find(c => c.id === selectedCompId)?.nombre : '…'})</span>
            <span className="text-2xl font-bold text-p-lime">{vpActual.toFixed(10).replace(/\.?0+$/, '')}</span>
          </div>
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">#</th>
                <th className="text-left">Atributo</th>
                <th className="text-center w-24">Peso</th>
                <th className="text-center w-40">Calificación</th>
                <th className="text-center w-28">Contribución</th>
              </tr>
            </thead>
            <tbody>
              {atributos.map((a, idx) => {
                const cal = currentCals[a.nombre] ?? 0
                return (
                  <tr key={idx}>
                    <td className="text-xs text-p-muted">{idx + 1}</td>
                    <td className="text-sm font-medium text-p-dark">{a.nombre}</td>
                    <td className="text-center text-xs text-p-gray font-mono">{a.peso.toFixed(10).replace(/\.?0+$/, '')}</td>
                    <td className="text-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={cal === 0 ? '' : String(cal)}
                        onChange={e => {
                          const v = parseFloat(e.target.value)
                          updateCal(a.nombre, isNaN(v) ? 0 : v)
                        }}
                        placeholder="0"
                        className="form-input py-1 text-sm text-center w-36 mx-auto font-mono"
                      />
                    </td>
                    <td className="text-center text-sm font-medium text-p-lime font-mono">
                      {(a.peso * cal).toFixed(10).replace(/\.?0+$/, '')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card text-center py-8 text-p-gray text-sm">
          {currentSkuId
            ? 'Este SKU no tiene atributos configurados en R-002.'
            : 'Selecciona un SKU para ver sus calificaciones.'}
        </div>
      )}

      <SaveBar onSave={() => mutation.mutate()} saving={mutation.isPending} dirty={dirty} />
    </div>
  )
}

// ─── ElasticidadTab (R-004) ───────────────────────────────────────────────────

function ElasticidadTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const { data = [], isLoading } = useQuery<ElasticidadItem[]>({
    queryKey: ['reglas-elasticidad', tenantId],
    queryFn: () => api.get<ElasticidadItem[]>(`reglas/elasticidad?tenantId=${tenantId}`).then(r => r.data),
  })

  const [items, setItems] = useState<ElasticidadItem[] | null>(null)
  const dirty = items !== null
  const current = items ?? data

  const update = (idx: number, value: number) => {
    setItems(current.map((e, i) => i === idx ? { ...e, coeficiente: value } : e))
  }

  const interpretacion = (c: number) =>
    c < -1.8 ? 'Muy elástico' : c < -1 ? 'Elástico' : 'Poco elástico'

  const badgeCls = (c: number) =>
    c < -1.8 ? 'badge badge-red' : c < -1 ? 'badge badge-yellow' : 'badge badge-green'

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/elasticidad?tenantId=${tenantId}`, current),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-elasticidad', tenantId] })
      setItems(null)
    },
  })

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-sm text-p-gray flex-1">
          Coeficientes de elasticidad por SKU. Negativos indican relación inversa (precio sube → demanda baja).
          Rango: 0 a -1 = poco elástico, -1 a -1.8 = elástico, &lt; -1.8 = muy elástico.
        </p>
        <SoloPrisierBadge />
      </div>
      <div className="card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="text-left">SKU</th>
              <th className="text-center">Coeficiente (ε)</th>
              <th className="text-center">Interpretación</th>
            </tr>
          </thead>
          <tbody>
            {current.map((e, idx) => (
              <tr key={e.skuId}>
                <td className="text-sm font-medium text-p-dark">{e.skuNombre}</td>
                <td className="text-center">
                  <input
                    type="number" step={0.01}
                    value={e.coeficiente}
                    onChange={ev => update(idx, Number(ev.target.value))}
                    className="form-input py-1 text-sm text-center w-24 mx-auto"
                  />
                </td>
                <td className="text-center text-xs">
                  <span className={badgeCls(e.coeficiente)}>{interpretacion(e.coeficiente)}</span>
                </td>
              </tr>
            ))}
            {current.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-6 text-p-gray text-sm">Sin SKUs configurados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <SaveBar onSave={() => mutation.mutate()} saving={mutation.isPending} dirty={dirty} />
    </div>
  )
}

// ─── CanalesTab (R-007 — canales × categorías) ───────────────────────────────

function CanalesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<CanalesMargenes>({
    queryKey: ['reglas-canales', tenantId],
    queryFn: () => api.get<CanalesMargenes>(`reglas/canales-margenes?tenantId=${tenantId}`).then(r => r.data),
  })

  const { data: portafolioData } = useQuery<PortafolioData>({
    queryKey: ['reglas-portafolio', tenantId],
    queryFn: () => api.get<PortafolioData>(`reglas/portafolio?tenantId=${tenantId}`).then(r => r.data),
  })

  const categorias = useMemo(() =>
    Array.from(new Set((portafolioData?.items ?? []).map(i => i.categoria))).sort(),
    [portafolioData]
  )

  const [form, setForm] = useState<CanalesMargenes | null>(null)
  const dirty = form !== null
  const current: CanalesMargenes = form ?? data ?? { iva: 0.19, canales: [] }

  const updateNombre = (idx: number, nombre: string) =>
    setForm({ ...current, canales: current.canales.map((c, i) => i === idx ? { ...c, nombre } : c) })

  const updateMargen = (idx: number, categoria: string, margen: number) =>
    setForm({ ...current, canales: current.canales.map((c, i) =>
      i === idx ? { ...c, margenes: { ...c.margenes, [categoria]: margen } } : c
    ) })

  const addCanal = () =>
    setForm({ ...current, canales: [...current.canales, {
      nombre: '',
      margenes: Object.fromEntries(categorias.map(cat => [cat, 0.70])),
    }] })

  const removeCanal = (idx: number) =>
    setForm({ ...current, canales: current.canales.filter((_, i) => i !== idx) })

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/canales-margenes?tenantId=${tenantId}`, current),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-canales', tenantId] })
      setForm(null)
    },
  })

  if (isLoading) return <Spinner />

  const colSpanTotal = 2 + categorias.length

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-sm text-p-gray flex-1">
          Márgenes por canal y categoría. El precio al canal = PVP sin IVA × margen. Las categorías se derivan del portafolio cargado.
        </p>
        <SoloPrisierBadge />
      </div>

      {categorias.length === 0 && (
        <div className="card text-center py-6 text-p-gray text-sm mb-4">
          Carga primero el portafolio para que aparezcan las categorías.
        </div>
      )}

      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-p-dark">Márgenes por canal</h3>
          <button onClick={addCanal} className="btn-secondary text-xs flex items-center gap-1 py-1" disabled={categorias.length === 0}>
            <Plus size={12} /> Canal
          </button>
        </div>

        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="text-left" style={{ minWidth: 140 }}>Canal</th>
              {categorias.map(cat => (
                <th key={cat} className="text-center" style={{ minWidth: 100 }}>{cat}</th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {current.canales.map((canal: CanalSimple, idx: number) => (
              <tr key={idx}>
                <td>
                  <input
                    value={canal.nombre}
                    onChange={e => updateNombre(idx, e.target.value)}
                    placeholder="Nombre del canal"
                    className="form-input py-1 text-sm w-full"
                  />
                </td>
                {categorias.map(cat => (
                  <td key={cat} className="text-center">
                    <input
                      type="number" min={1} max={100} step={1}
                      value={Math.round((canal.margenes?.[cat] ?? 0.70) * 100)}
                      onChange={e => updateMargen(idx, cat, Number(e.target.value) / 100)}
                      className="form-input py-1 text-sm text-center w-20 mx-auto"
                    />
                  </td>
                ))}
                <td className="text-center">
                  <button onClick={() => removeCanal(idx)} className="text-p-muted hover:text-p-red transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {current.canales.length === 0 && (
              <tr>
                <td colSpan={colSpanTotal} className="text-center py-6 text-p-gray text-sm">
                  Sin canales — haz clic en "+ Canal" para agregar uno.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <SaveBar onSave={() => mutation.mutate()} saving={mutation.isPending} dirty={dirty} />
    </div>
  )
}

// ─── UmbralesTab (R-008) ──────────────────────────────────────────────────────

function UmbralesTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery<Umbrales>({
    queryKey: ['reglas-umbrales', tenantId],
    queryFn: () => api.get<Umbrales>(`reglas/umbrales?tenantId=${tenantId}`).then(r => r.data),
  })

  const [form, setForm] = useState<Umbrales | null>(null)
  const dirty = form !== null
  const current = form ?? data ?? { umbralSuperior: 0.05, umbralInferior: 0.05 }

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/umbrales?tenantId=${tenantId}`, current),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-umbrales', tenantId] })

      setForm(null)
    },
  })

  if (isLoading) return <Spinner />

  return (
    <div>
      <p className="text-sm text-p-gray mb-4">
        Define el porcentaje de desviación que dispara una alerta. Se aplica a todos los SKUs del tenant.
      </p>
      <div className="card max-w-sm">
        <div className="space-y-5">
          {[
            { field: 'umbralSuperior' as const, label: 'Umbral superior', color: 'text-p-red', desc: 'Alerta cuando el precio sube más de X%' },
            { field: 'umbralInferior' as const, label: 'Umbral inferior', color: 'text-p-blue', desc: 'Alerta cuando el precio baja más de X%' },
          ].map(({ field, label, color, desc }) => (
            <div key={field}>
              <label className="form-label">{label}</label>
              <p className="text-xs text-p-muted mb-2">{desc}</p>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={1} max={30} step={0.5}
                  value={Math.round(current[field] * 100)}
                  onChange={e => setForm({ ...current, [field]: Number(e.target.value) / 100 })}
                  className="flex-1 accent-p-lime"
                />
                <span className={`text-xl font-bold tabular-nums w-16 text-right ${color}`}>
                  {(current[field] * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 p-3 rounded-lg bg-p-bg border border-p-border">
          <p className="text-xs text-p-muted mb-2">Zona de alerta visualizada</p>
          <div className="relative h-6 rounded-full bg-gradient-to-r from-p-red via-p-lime to-p-red overflow-hidden opacity-70" />
          <div className="flex justify-between text-[10px] text-p-muted mt-1">
            <span>-{(current.umbralInferior * 100).toFixed(1)}%</span>
            <span className="text-p-lime text-xs font-medium">Precio actual</span>
            <span>+{(current.umbralSuperior * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
      <SaveBar onSave={() => mutation.mutate()} saving={mutation.isPending} dirty={dirty} />
    </div>
  )
}

// ─── RetailersTab (R-010) ─────────────────────────────────────────────────────

function RetailersTab({ tenantId }: { tenantId: string }) {
  const queryClient = useQueryClient()
  const { data = [], isLoading } = useQuery<RetailerItem[]>({
    queryKey: ['reglas-retailers', tenantId],
    queryFn: () => api.get<RetailerItem[]>(`reglas/retailers?tenantId=${tenantId}`).then(r => r.data),
  })

  const [items, setItems] = useState<RetailerItem[] | null>(null)
  const [newNombre, setNewNombre] = useState('')
  const dirty = items !== null
  const current = items ?? data

  const toggleActivo = (id: string) =>
    setItems(current.map(r => r.id === id ? { ...r, activo: !r.activo } : r))

  const removeRetailer = (id: string) =>
    setItems(current.filter(r => r.id !== id))

  const addRetailer = () => {
    if (!newNombre.trim()) return
    const newItem: RetailerItem = { id: `new-${Date.now()}`, nombre: newNombre.trim(), activo: true }
    setItems([...current, newItem])
    setNewNombre('')
  }

  const updateNombre = (id: string, nombre: string) =>
    setItems(current.map(r => r.id === id ? { ...r, nombre } : r))

  const mutation = useMutation({
    mutationFn: () => api.put(`reglas/retailers?tenantId=${tenantId}`, current),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reglas-retailers', tenantId] })

      setItems(null)
    },
  })

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-sm text-p-gray flex-1">
          Listado de retailers del tenant. Solo los activos aparecen en comparaciones de precios.
        </p>
        <SoloPrisierBadge />
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th className="text-left">Nombre</th>
              <th className="text-center w-28">Estado</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {current.map(r => (
              <tr key={r.id}>
                <td>
                  <input
                    value={r.nombre}
                    onChange={e => updateNombre(r.id, e.target.value)}
                    className="form-input py-1 text-sm w-full"
                  />
                </td>
                <td className="text-center">
                  <button
                    onClick={() => toggleActivo(r.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                      r.activo
                        ? 'bg-p-lime/20 text-p-lime border-p-lime/40'
                        : 'bg-p-border/40 text-p-muted border-p-border'
                    }`}
                  >
                    {r.activo ? '✓ Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="text-center">
                  <button onClick={() => removeRetailer(r.id)} className="text-p-muted hover:text-p-red transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Add row */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-p-border">
          <input
            type="text"
            placeholder="Nombre del nuevo retailer…"
            value={newNombre}
            onChange={e => setNewNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRetailer()}
            className="form-input py-1.5 text-sm flex-1"
          />
          <button onClick={addRetailer} disabled={!newNombre.trim()}
            className="btn-secondary text-xs flex items-center gap-1 py-1.5 disabled:opacity-40">
            <Plus size={13} /> Agregar
          </button>
        </div>
      </div>
      <SaveBar onSave={() => mutation.mutate()} saving={mutation.isPending} dirty={dirty} />
    </div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-p-lime border-t-transparent" />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReglesPage() {
  const [tenantId, setTenantId] = useState('tenant-001')
  const [tab, setTab] = useState('portafolio')

  const { data: tenants = [] } = useQuery<TenantListItem[]>({
    queryKey: ['tenants'],
    queryFn: () => api.get<TenantListItem[]>('tenants').then(r => r.data),
  })

  return (
    <div>
      {/* Tenant selector */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-sm text-p-gray font-medium">Tenant:</span>
        <select
          value={tenantId}
          onChange={e => setTenantId(e.target.value)}
          className="form-input py-1.5 text-sm w-48"
        >
          {tenants.map(t => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-p-border mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? 'border-p-lime text-p-lime'
                : 'border-transparent text-p-gray hover:text-p-dark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'portafolio'     && <PortafolioTab tenantId={tenantId} />}
      {tab === 'importaciones'  && <ImportacionesTab tenantId={tenantId} />}
      {tab === 'atributos'      && <AtributosTab tenantId={tenantId} />}
      {tab === 'calificaciones' && <CalificacionesTab tenantId={tenantId} />}
      {tab === 'elasticidad'    && <ElasticidadTab tenantId={tenantId} />}
      {tab === 'canales'        && <CanalesTab tenantId={tenantId} />}
      {tab === 'umbrales'       && <UmbralesTab tenantId={tenantId} />}
      {tab === 'retailers'      && <RetailersTab tenantId={tenantId} />}
    </div>
  )
}
