import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, Users, DollarSign, Settings,
  Activity, AlertTriangle, CheckCircle2, ShieldCheck,
  XCircle, AlertCircle, ArrowRight,
} from 'lucide-react'
import api from '../lib/api'
import type { TenantListItem, UserListItem, AuditLogRow, ScraperHistorialRow, ReglaResumenItem } from '../lib/types'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 2) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

const ACCION_BADGE: Record<string, string> = {
  login: 'badge',
  logout: 'badge',
  cambio_regla: 'badge-yellow',
  creacion_tenant: 'badge-green',
  edicion_tenant: 'badge',
  creacion_usuario: 'badge-green',
  edicion_usuario: 'badge',
  upload_archivo: 'badge-green',
  exportacion: 'badge',
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: tenants = [] } = useQuery<TenantListItem[]>({
    queryKey: ['tenants'],
    queryFn: () => api.get<TenantListItem[]>('tenants').then(r => r.data),
  })

  const { data: users = [] } = useQuery<UserListItem[]>({
    queryKey: ['users'],
    queryFn: () => api.get<UserListItem[]>('users').then(r => r.data),
  })

  const { data: recentLogs = [] } = useQuery<AuditLogRow[]>({
    queryKey: ['audit-logs-dashboard'],
    queryFn: () => api.get<AuditLogRow[]>('audit-logs?pageSize=6').then(r => r.data),
  })

  const { data: cargas = [] } = useQuery<ScraperHistorialRow[]>({
    queryKey: ['scraper-historial-dashboard'],
    queryFn: () => api.get<ScraperHistorialRow[]>('admin/scraper/historial?tenantId=tenant-001').then(r => r.data),
  })

  const { data: reglas = [] } = useQuery<ReglaResumenItem[]>({
    queryKey: ['reglas-resumen-dashboard'],
    queryFn: () => api.get<ReglaResumenItem[]>('reglas/resumen').then(r => r.data),
  })

  const totalPrecios = useMemo(() =>
    cargas.reduce((sum, c) => sum + c.registrosProcesados, 0), [cargas])

  const reglasConfig = reglas.filter(r => r.configurada).length

  const alerts = useMemo(() => {
    const list: { type: 'error' | 'warning'; message: string; to: string }[] = []
    const errorCargas = cargas.filter(c => c.estado === 'error')
    if (errorCargas.length)
      list.push({ type: 'error', message: `${errorCargas.length} carga(s) de scraper fallida(s)`, to: '/scraper' })
    const warnCargas = cargas.filter(c => c.estado === 'completado_con_errores')
    if (warnCargas.length)
      list.push({ type: 'warning', message: `${warnCargas.length} carga(s) con advertencias`, to: '/scraper' })
    const unconf = reglas.filter(r => !r.configurada)
    if (unconf.length)
      list.push({ type: 'warning', message: `${unconf.length} regla(s) sin configurar`, to: '/reglas' })
    return list
  }, [cargas, reglas])

  const kpis = [
    {
      label: 'Tenants activos',
      value: tenants.filter(t => t.estado === 'activo').length,
      sub: `${tenants.length} total`,
      icon: Building2,
      color: 'text-p-lime',
      to: '/tenants',
    },
    {
      label: 'Usuarios',
      value: users.filter(u => u.estado === 'activo').length,
      sub: `${users.length} registrados`,
      icon: Users,
      color: 'text-p-blue',
      to: '/usuarios',
    },
    {
      label: 'Precios capturados',
      value: totalPrecios.toLocaleString('es-CO'),
      sub: `${cargas.length} cargas realizadas`,
      icon: DollarSign,
      color: 'text-p-lime',
      to: '/scraper',
    },
    {
      label: 'Reglas configuradas',
      value: `${reglasConfig}/${reglas.length}`,
      sub: reglas.length > 0 && reglasConfig < reglas.length ? 'Hay pendientes' : 'Completas',
      icon: Settings,
      color: reglasConfig < reglas.length && reglas.length > 0 ? 'text-p-yellow' : 'text-p-lime',
      to: '/reglas',
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-5">
        {kpis.map(k => (
          <button
            key={k.label}
            onClick={() => navigate(k.to)}
            className="card text-left w-full hover:border-p-lime/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-p-gray">{k.label}</p>
              <k.icon size={18} className={k.color} />
            </div>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-p-muted mt-1">{k.sub}</p>
          </button>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-[1fr_360px] gap-5 items-start">

        {/* Actividad reciente */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-p-dark flex items-center gap-2">
              <Activity size={15} className="text-p-muted" />
              Actividad reciente
            </h3>
            <Link to="/auditoria" className="text-xs text-p-lime hover:underline flex items-center gap-1">
              Ver todo <ArrowRight size={11} />
            </Link>
          </div>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-p-muted py-8 text-center">Sin actividad registrada</p>
          ) : (
            <div className="divide-y divide-p-border">
              {recentLogs.map(log => (
                <div key={log.id} className="py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-p-bg border border-p-border flex items-center justify-center shrink-0 text-xs font-bold text-p-gray select-none">
                    {log.usuario.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-p-dark truncate">{log.usuario}</p>
                    <p className="text-xs text-p-muted truncate">
                      {log.tenantNombre ?? 'Global'} · {timeAgo(log.fecha)}
                    </p>
                  </div>
                  <span className={`badge text-xs shrink-0 ${ACCION_BADGE[log.accion] ?? 'badge'}`}>
                    {log.accion.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna derecha */}
        <div className="space-y-5">

          {/* Alertas */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-p-dark flex items-center gap-2">
                <AlertTriangle size={15} className="text-p-yellow" />
                Alertas
              </h3>
              {alerts.length > 0 && (
                <span className="badge badge-yellow text-xs">{alerts.length}</span>
              )}
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-p-muted flex items-center gap-2 py-1">
                <CheckCircle2 size={14} className="text-p-lime" />
                Todo en orden
              </p>
            ) : (
              <div className="space-y-1">
                {alerts.map((a, i) => (
                  <Link
                    key={i}
                    to={a.to}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    {a.type === 'error'
                      ? <XCircle size={15} className="text-p-red shrink-0" />
                      : <AlertCircle size={15} className="text-p-yellow shrink-0" />
                    }
                    <span className="text-sm text-p-dark group-hover:text-p-lime transition-colors flex-1">
                      {a.message}
                    </span>
                    <ArrowRight size={12} className="text-p-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Salud de configuración por tenant */}
          <div className="card">
            <h3 className="text-sm font-semibold text-p-dark mb-4 flex items-center gap-2">
              <ShieldCheck size={15} className="text-p-muted" />
              Salud de configuración
            </h3>
            {tenants.length === 0 ? (
              <p className="text-sm text-p-muted">Sin tenants registrados</p>
            ) : (
              tenants.map(tenant => (
                <div key={tenant.id} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-p-dark">{tenant.nombre}</p>
                    <span className="text-xs text-p-muted">{reglasConfig}/{reglas.length} reglas</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {reglas.map(r => (
                      <span
                        key={r.tipo}
                        title={`${r.descripcion}${r.actualizadaEn ? ` · ${r.actualizadaEn.slice(0, 10)}` : ''}`}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                          r.configurada
                            ? 'border-p-lime/30 text-p-lime bg-p-lime/10'
                            : 'border-p-border text-p-muted'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${r.configurada ? 'bg-p-lime' : 'bg-p-muted/50'}`} />
                        {r.tipo}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
