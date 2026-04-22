import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, UserPlus, X, PowerOff } from 'lucide-react'
import { useForm } from 'react-hook-form'
import api from '../lib/api'
import type { TenantListItem, ConsultorInfo, UserListItem } from '../lib/types'

interface TenantForm {
  nombre: string
  industria: string
  plan: string
  estado: string
}

export default function TenantsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [assignTenantId, setAssignTenantId] = useState<string | null>(null)
  const [confirmDesactivar, setConfirmDesactivar] = useState<TenantListItem | null>(null)

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get<TenantListItem[]>('/tenants').then(r => r.data),
  })

  const { register, handleSubmit, reset, setValue } = useForm<TenantForm>({
    defaultValues: { industria: 'consumo_masivo', plan: 'basico', estado: 'activo' },
  })

  const toggleEstadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: string }) =>
      api.patch(`/tenants/${id}/estado`, { estado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setConfirmDesactivar(null)
    },
  })

  const saveMutation = useMutation({
    mutationFn: (data: TenantForm) =>
      editingId
        ? api.put(`/tenants/${editingId}`, data)
        : api.post('/tenants', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      closeForm()
    },
  })

  const openCreate = () => {
    setEditingId(null)
    reset({ nombre: '', industria: 'consumo_masivo', plan: 'basico', estado: 'activo' })
    setShowForm(true)
  }

  const openEdit = (t: TenantListItem) => {
    setEditingId(t.id)
    setValue('nombre', t.nombre)
    setValue('industria', t.industria)
    setValue('plan', t.plan)
    setValue('estado', t.estado)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    reset()
  }

  const onSubmit = (data: TenantForm) => saveMutation.mutate(data)

  const estadoBadge = (estado: string) => {
    const cls: Record<string, string> = {
      activo: 'badge-green',
      inactivo: 'badge-yellow',
      suspendido: 'badge-red',
    }
    return <span className={`badge ${cls[estado] || 'badge-yellow'}`}>{estado}</span>
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-2 border-p-lime border-t-transparent" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div />
        <button onClick={openCreate} className="btn-primary">
          <Plus size={18} /> Nuevo Tenant
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-p-dark">{editingId ? 'Editar Tenant' : 'Nuevo Tenant'}</h2>
              <button onClick={closeForm}><X size={20} className="text-p-gray" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="form-label">Nombre</label>
                <input {...register('nombre', { required: true })} className="form-input" />
              </div>
              <div>
                <label className="form-label">Industria</label>
                <select {...register('industria')} className="form-input">
                  <option value="consumo_masivo">Consumo Masivo</option>
                  <option value="educacion">Educación</option>
                  <option value="moda">Moda</option>
                </select>
              </div>
              <div>
                <label className="form-label">Plan</label>
                <input {...register('plan', { required: true })} className="form-input" />
              </div>
              {editingId && (
                <div>
                  <label className="form-label">Estado</label>
                  <select {...register('estado')} className="form-input">
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="suspendido">Suspendido</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1 justify-center disabled:opacity-50">
                  {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
              {saveMutation.isError && (
                <p className="text-p-red text-sm">Error al guardar el tenant</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Assign Consultor Modal */}
      {assignTenantId && (
        <AssignConsultorModal
          tenantId={assignTenantId}
          onClose={() => setAssignTenantId(null)}
        />
      )}

      {/* Confirm Desactivar Modal */}
      {confirmDesactivar && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-sm shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-p-dark">¿Desactivar {confirmDesactivar.nombre}?</h2>
            <p className="text-sm text-p-gray">
              Todos los usuarios de este cliente perderán el acceso inmediatamente. Esta acción se puede revertir.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDesactivar(null)}
                className="btn-secondary text-sm px-4 py-1.5"
              >
                Cancelar
              </button>
              <button
                onClick={() => toggleEstadoMutation.mutate({ id: confirmDesactivar.id, estado: 'inactivo' })}
                disabled={toggleEstadoMutation.isPending}
                className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {toggleEstadoMutation.isPending ? 'Desactivando...' : 'Desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Industria</th>
              <th>Plan</th>
              <th>Estado</th>
              <th>Usuarios</th>
              <th>Consultores</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td className="font-medium text-p-dark">{t.nombre}</td>
                <td className="text-p-gray capitalize">{t.industria.replace('_', ' ')}</td>
                <td className="text-p-gray capitalize">{t.plan}</td>
                <td>{estadoBadge(t.estado)}</td>
                <td className="text-p-gray">{t.usuariosCount}</td>
                <td>
                  {t.consultores.length > 0
                    ? t.consultores.map(c => c.nombreCompleto).join(', ')
                    : <span className="text-p-muted">Sin asignar</span>}
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(t)} className="p-2 text-p-gray hover:text-p-lime rounded-lg hover:bg-p-lime-bg transition-colors" title="Editar">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setAssignTenantId(t.id)} className="p-2 text-p-gray hover:text-p-lime rounded-lg hover:bg-p-lime-bg transition-colors" title="Asignar consultor">
                      <UserPlus size={15} />
                    </button>
                    {t.estado === 'activo' ? (
                      <button
                        onClick={() => setConfirmDesactivar(t)}
                        className="p-2 text-p-gray hover:text-p-red rounded-lg hover:bg-red-50 transition-colors"
                        title="Desactivar"
                      >
                        <PowerOff size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleEstadoMutation.mutate({ id: t.id, estado: 'activo' })}
                        className="p-2 text-p-muted hover:text-p-lime rounded-lg hover:bg-p-lime-bg transition-colors"
                        title="Reactivar"
                      >
                        <PowerOff size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-p-muted">No hay tenants registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AssignConsultorModal({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const queryClient = useQueryClient()

  const { data: consultores = [] } = useQuery({
    queryKey: ['consultores'],
    queryFn: () => api.get<UserListItem[]>('/users/consultores').then(r => r.data),
  })

  const { data: tenant } = useQuery({
    queryKey: ['tenants', tenantId],
    queryFn: () => api.get<{ consultores: ConsultorInfo[] }>(`/tenants/${tenantId}`).then(r => r.data),
  })

  const assignMutation = useMutation({
    mutationFn: (consultorUserId: string) =>
      api.post(`/tenants/${tenantId}/consultores`, { consultorUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: (consultorUserId: string) =>
      api.delete(`/tenants/${tenantId}/consultores/${consultorUserId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId] })
    },
  })

  const assignedIds = new Set(tenant?.consultores?.map(c => c.userId) || [])

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="card p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-p-dark">Asignar Consultores</h2>
          <button onClick={onClose}><X size={20} className="text-p-gray" /></button>
        </div>

        {tenant?.consultores && tenant.consultores.length > 0 && (
          <div className="mb-4">
            <p className="form-label">Asignados:</p>
            <div className="space-y-2">
              {tenant.consultores.map(c => (
                <div key={c.userId} className="flex items-center justify-between bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                  <span className="text-sm text-p-dark">{c.nombreCompleto} ({c.email})</span>
                  <button
                    onClick={() => removeMutation.mutate(c.userId)}
                    className="text-p-red hover:text-red-700"
                    disabled={removeMutation.isPending}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="form-label">Disponibles:</p>
          <div className="space-y-2 max-h-60 overflow-auto">
            {consultores.filter(c => !assignedIds.has(c.id)).map(c => (
              <div key={c.id} className="flex items-center justify-between bg-p-bg px-3 py-2 rounded-lg border border-p-border">
                <span className="text-sm text-p-dark">{c.nombreCompleto} ({c.email})</span>
                <button
                  onClick={() => assignMutation.mutate(c.id)}
                  className="text-p-lime hover:text-p-lime-light"
                  disabled={assignMutation.isPending}
                >
                  <Plus size={16} />
                </button>
              </div>
            ))}
            {consultores.filter(c => !assignedIds.has(c.id)).length === 0 && (
              <p className="text-sm text-p-muted py-2">No hay consultores disponibles</p>
            )}
          </div>
        </div>

        <button onClick={onClose} className="btn-secondary w-full mt-4 justify-center">
          Cerrar
        </button>
      </div>
    </div>
  )
}
