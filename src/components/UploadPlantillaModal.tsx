import { useRef, useId, useEffect, useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Upload, X, AlertTriangle, CheckCircle2, Loader2, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { useFocusTrap } from '../lib/useFocusTrap'
import { useToast } from './useToast'
import { downloadBlob } from '../lib/download'
import api from '../lib/api'
import type { TipoPlantilla, ImportacionPreview, ImportacionError, EstadoImportacion } from '../lib/types'
import { TEMPLATE_SPECS, MAX_FILE_SIZE_BYTES } from '../lib/templateSpecs'

// ─── Props ────────────────────────────────────────────────────────────────────

interface UploadPlantillaModalProps {
  tipo: TipoPlantilla
  tenantId: string
  isOpen: boolean
  onClose: () => void
  onConfirmed: (importId: string) => void
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

type Phase = 'dropzone' | 'preview' | 'processing' | 'finalizado'

interface DropzoneError {
  message: string
  details?: string
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

/**
 * Validación ligera en frontend: extensión, tamaño, hoja canónica, headers.
 * Devuelve null si OK o un objeto de error si falla.
 */
async function validateFile(file: File, tipo: TipoPlantilla): Promise<DropzoneError | null> {
  const spec = TEMPLATE_SPECS[tipo]

  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return { message: 'El archivo debe tener extensión .xlsx' }
  }

  if (file.size >= MAX_FILE_SIZE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return { message: `Archivo muy grande (${mb} MB). El límite es menor a 10 MB.` }
  }

  // Leer workbook para verificar hoja y headers
  try {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })

    const sheetExists = wb.SheetNames.some(
      name => name.trim().toLowerCase() === spec.sheetName.trim().toLowerCase()
    )
    if (!sheetExists) {
      return {
        message: `Falta la hoja "${spec.sheetName}"`,
        details: `Hojas encontradas: ${wb.SheetNames.join(', ') || '(ninguna)'}`,
      }
    }

    const sheet = wb.Sheets[spec.sheetName] ?? wb.Sheets[
      wb.SheetNames.find(n => n.trim().toLowerCase() === spec.sheetName.trim().toLowerCase()) ?? ''
    ]
    if (!sheet) return { message: `No se pudo leer la hoja "${spec.sheetName}"` }

    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
    const headerRow = (rows[0] ?? []) as string[]
    const normalizedFound = headerRow.map(h => String(h ?? '').trim())
    const missing = spec.headers.filter(h => !normalizedFound.includes(h))

    if (missing.length > 0) {
      return {
        message: `Faltan columnas en la hoja "${spec.sheetName}"`,
        details: `Esperadas: ${spec.headers.join(', ')} | Faltantes: ${missing.join(', ')}`,
      }
    }
  } catch {
    return { message: 'No se pudo leer el archivo .xlsx. Verificá que no esté corrupto o protegido.' }
  }

  return null
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function ErroresTable({ errores }: { errores: ImportacionError[] }) {
  const [expanded, setExpanded] = useState(false)
  const VISIBLE = 5
  const shown = expanded ? errores : errores.slice(0, VISIBLE)

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-p-gray uppercase tracking-wider mb-2">
        Errores / omisiones ({errores.length})
      </p>
      <div className="rounded-lg border border-p-border overflow-hidden">
        <table className="data-table w-full text-xs">
          <thead>
            <tr>
              <th className="text-left w-12">Fila</th>
              <th className="text-left w-24">Columna</th>
              <th className="text-left">Mensaje</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e, i) => (
              <tr key={i}>
                <td>{e.fila}</td>
                <td className="text-p-gray">{e.columna ?? '—'}</td>
                <td className="text-p-red">{e.mensaje}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {errores.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-p-blue flex items-center gap-1 hover:underline"
        >
          {expanded
            ? <><ChevronUp size={12} aria-hidden /> Mostrar menos</>
            : <><ChevronDown size={12} aria-hidden /> Ver {errores.length - VISIBLE} más</>}
        </button>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function UploadPlantillaModal({
  tipo,
  tenantId,
  isOpen,
  onClose,
  onConfirmed,
}: UploadPlantillaModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()
  const spec = TEMPLATE_SPECS[tipo]

  const [phase, setPhase] = useState<Phase>('dropzone')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [dropError, setDropError] = useState<DropzoneError | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportacionPreview | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [lockError, setLockError] = useState<string | null>(null)
  const [finalImportId, setFinalImportId] = useState<string | null>(null)
  const [estadoTerminal, setEstadoTerminal] = useState<Exclude<EstadoImportacion, 'procesando'> | null>(null)

  // Focus trap — activo siempre que el modal esté abierto
  useFocusTrap(dialogRef, isOpen)

  // Escape: solo en fase dropzone o finalizado; NO en preview (evitar perder trabajo)
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (phase === 'dropzone' || phase === 'finalizado') {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset al cerrar o al cambiar tipo
  useEffect(() => {
    if (!isOpen) {
      setPhase('dropzone')
      setDropError(null)
      setSelectedFile(null)
      setPreview(null)
      setLockError(null)
      setFinalImportId(null)
      setEstadoTerminal(null)
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    // Cancelar preview si existe
    if (preview?.previewId && phase === 'preview') {
      api.delete(`admin/importaciones/${preview.previewId}`).catch(() => { /* silent */ })
    }
    onClose()
  }, [preview, phase, onClose])

  const processFile = useCallback(async (file: File) => {
    setDropError(null)
    setIsValidating(true)
    try {
      const err = await validateFile(file, tipo)
      if (err) {
        setDropError(err)
        return
      }
      setSelectedFile(file)
      setIsSending(true)

      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await api.post<ImportacionPreview>(
          `admin/importaciones/${tipo}/preview?tenantId=${tenantId}`,
          formData,
        )
        setPreview(res.data)
        setPhase('preview')
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number; data?: { error?: string } } }).response?.status
        const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
        if (status === 409) {
          setLockError(msg ?? 'Hay una importación del mismo tipo en curso.')
        } else {
          toast.error(msg ?? 'Error al procesar el archivo. Intentá de nuevo.')
        }
        setSelectedFile(null)
      } finally {
        setIsSending(false)
      }
    } finally {
      setIsValidating(false)
    }
  }, [tipo, tenantId, toast])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleConfirm = useCallback(async () => {
    if (!preview) return
    setIsConfirming(true)
    try {
      const res = await api.post<{ importId: string }>(
        `admin/importaciones/${preview.previewId}/confirmar?tenantId=${tenantId}`,
      )
      const importId = res.data.importId
      setFinalImportId(importId)
      setPhase('processing')

      // Esperar a que el mock resuelva el estado terminal (2.5s backend + margen)
      setTimeout(async () => {
        try {
          const detail = await api.get<{ estado: EstadoImportacion }>(`admin/importaciones/${importId}`)
          const estado = detail.data.estado
          setEstadoTerminal(estado !== 'procesando' ? estado : 'exitoso')
        } catch {
          setEstadoTerminal('exitoso')
        }
        setPhase('finalizado')
        onConfirmed(importId)
        toast.success(`Importación de ${spec.label} procesada`)
      }, 3000)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { error?: string } } }).response?.status
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      if (status === 409) {
        setLockError(msg ?? 'Hay una importación del mismo tipo en curso.')
        setPhase('dropzone')
        setPreview(null)
        setSelectedFile(null)
      } else if (status === 410) {
        toast.error('El preview expiró. Volvé a subir el archivo.')
        setPhase('dropzone')
        setPreview(null)
        setSelectedFile(null)
      } else {
        toast.error(msg ?? 'Error al confirmar la importación. Intentá de nuevo.')
      }
    } finally {
      setIsConfirming(false)
    }
  }, [preview, tenantId, spec.label, onConfirmed, toast])

  const handleDownloadAnotado = useCallback(async () => {
    if (!finalImportId) return
    try {
      const res = await api.get<Blob>(`admin/importaciones/${finalImportId}/errores.xlsx`, { responseType: 'blob' })
      downloadBlob(res.data, `errores-${tipo}-${finalImportId}.xlsx`)
    } catch {
      toast.error('No se pudo descargar el Excel anotado.')
    }
  }, [finalImportId, tipo, toast])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={e => {
        if (e.target === e.currentTarget && (phase === 'dropzone' || phase === 'finalizado')) {
          handleClose()
        }
      }}
      aria-hidden="false"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-p-border">
          <h2 id={titleId} className="text-base font-semibold text-p-dark">
            Importar {spec.label}
          </h2>
          {(phase === 'dropzone' || phase === 'finalizado') && (
            <button
              type="button"
              onClick={handleClose}
              aria-label="Cerrar modal"
              className="btn-icon text-p-gray hover:text-p-dark"
            >
              <X size={18} aria-hidden />
            </button>
          )}
        </div>

        <div className="px-5 py-4">
          {/* ── FASE 1: DROP-ZONE ──────────────────────────────────────── */}
          {phase === 'dropzone' && (
            <>
              {lockError && (
                <div role="alert" className="mb-4 flex items-start gap-2 p-3 bg-p-yellow/10 border border-p-yellow/30 rounded-lg">
                  <AlertTriangle size={16} className="text-p-dark shrink-0 mt-0.5" aria-hidden />
                  <p className="text-sm text-p-dark">{lockError}</p>
                </div>
              )}

              <p className="text-sm text-p-gray mb-4">
                Arrastrá o seleccioná un archivo <code className="text-xs bg-p-bg px-1 rounded">.xlsx</code> con
                la plantilla de <strong>{spec.label}</strong>. El sistema validará los datos antes de aplicarlos.
              </p>

              {/* Drop zone */}
              <div
                role="button"
                tabIndex={0}
                aria-label={`Seleccionar archivo Excel para importar ${spec.label}`}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                  ${isDragOver ? 'border-p-lime bg-p-lime/5' : 'border-p-border hover:border-p-lime/50 hover:bg-p-bg/40'}
                  ${(isValidating || isSending) ? 'pointer-events-none opacity-60' : ''}`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  aria-hidden="true"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) processFile(f)
                    e.target.value = ''
                  }}
                />
                {(isValidating || isSending) ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="text-p-lime animate-spin" aria-hidden />
                    <p className="text-sm text-p-gray">
                      {isValidating ? 'Validando archivo…' : 'Enviando al servidor…'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload size={32} className={isDragOver ? 'text-p-lime' : 'text-p-muted'} aria-hidden />
                    <div>
                      <p className="text-sm font-medium text-p-dark">
                        Arrastrá el archivo aquí o hacé clic para seleccionar
                      </p>
                      <p className="text-xs text-p-muted mt-1">Solo .xlsx · Máx. 10 MB</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Error de validación frontend */}
              {dropError && (
                <div role="alert" className="mt-3 flex flex-col gap-1 p-3 bg-p-red/5 border border-p-red/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={15} className="text-p-red shrink-0 mt-0.5" aria-hidden />
                    <p className="text-sm text-p-red font-medium">{dropError.message}</p>
                  </div>
                  {dropError.details && (
                    <p className="text-xs text-p-gray ml-5">{dropError.details}</p>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-p-border flex justify-end">
                <button type="button" onClick={handleClose} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </>
          )}

          {/* ── FASE 2: PREVIEW ───────────────────────────────────────── */}
          {phase === 'preview' && preview && (
            <>
              <p className="text-sm text-p-gray mb-4">
                Archivo: <span className="font-medium text-p-dark">{selectedFile?.name}</span>
              </p>

              {/* Resumen */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg border border-p-border p-3 text-center">
                  <p className="text-2xl font-bold text-p-lime">{preview.resumen.nuevas}</p>
                  <p className="text-xs text-p-gray mt-1">Nuevas</p>
                </div>
                <div className="rounded-lg border border-p-border p-3 text-center">
                  <p className="text-2xl font-bold text-p-blue">{preview.resumen.actualizadas}</p>
                  <p className="text-xs text-p-gray mt-1">Actualizadas</p>
                </div>
                <div className={`rounded-lg border p-3 text-center ${preview.resumen.omitidas > 0 ? 'border-p-yellow/30 bg-p-yellow/5' : 'border-p-border'}`}>
                  <p className={`text-2xl font-bold ${preview.resumen.omitidas > 0 ? 'text-p-dark' : 'text-p-muted'}`}>
                    {preview.resumen.omitidas}
                  </p>
                  <p className="text-xs text-p-gray mt-1">Omitidas</p>
                </div>
              </div>

              {/* Advertencia importación parcial */}
              {preview.resumen.omitidas > 0 && (
                <div className="mb-3 flex items-start gap-2 p-3 bg-p-yellow/10 border border-p-yellow/30 rounded-lg">
                  <AlertTriangle size={15} className="text-p-dark shrink-0 mt-0.5" aria-hidden />
                  <p className="text-sm text-p-dark">
                    <strong>{preview.resumen.omitidas} filas serán omitidas</strong> por errores. El resto se aplicará normalmente.
                    Podés confirmar igual o cancelar, corregir el archivo y volver a subirlo.
                  </p>
                </div>
              )}

              {/* Tabla de errores */}
              {preview.errores.length > 0 && (
                <ErroresTable errores={preview.errores} />
              )}

              <div className="mt-5 pt-4 border-t border-p-border flex flex-col-reverse sm:flex-row justify-between gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary"
                  disabled={isConfirming}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className="btn-primary"
                >
                  {isConfirming
                    ? <><Loader2 size={15} className="animate-spin" aria-hidden /> Confirmando…</>
                    : 'Confirmar importación'}
                </button>
              </div>
            </>
          )}

          {/* ── FASE 3: PROCESANDO ────────────────────────────────────── */}
          {phase === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 size={40} className="text-p-lime animate-spin" aria-hidden />
              <div className="text-center">
                <p className="text-sm font-medium text-p-dark">Aplicando importación de {spec.label}…</p>
                <p className="text-xs text-p-gray mt-1">Esto puede tomar unos segundos</p>
              </div>
            </div>
          )}

          {/* ── FASE 4: FINALIZADO ────────────────────────────────────── */}
          {phase === 'finalizado' && (() => {
            const esExitoso = estadoTerminal === 'exitoso'
            const esAdvertencia = estadoTerminal === 'con_advertencias'
            const esFallido = estadoTerminal === 'fallido'
            const tieneErrores = (preview?.errores.length ?? 0) > 0 || esFallido
            const bannerStyle = esExitoso
              ? 'bg-p-lime/5 border-p-lime/25'
              : esAdvertencia
                ? 'bg-p-yellow/10 border-p-yellow/30'
                : 'bg-p-red/5 border-p-red/20'
            const iconEl = esExitoso
              ? <CheckCircle2 size={20} className="text-p-lime shrink-0 mt-0.5" aria-hidden />
              : esAdvertencia
                ? <AlertTriangle size={20} className="text-p-dark shrink-0 mt-0.5" aria-hidden />
                : <AlertTriangle size={20} className="text-p-red shrink-0 mt-0.5" aria-hidden />
            const titulo = esExitoso
              ? `Importación exitosa — ${spec.label}`
              : esAdvertencia
                ? `Importación con advertencias — ${spec.label}`
                : `Importación fallida — ${spec.label}`
            const subtitulo = esExitoso
              ? 'Todos los datos se aplicaron correctamente. El historial ya está actualizado.'
              : esAdvertencia
                ? 'La importación se completó parcialmente. Revisá el Excel anotado con las filas omitidas.'
                : 'No se pudo aplicar ningún dato. Revisá el Excel anotado para corregir los errores.'

            return (
              <>
                <div className={`flex items-start gap-3 mb-4 p-3 border rounded-lg ${bannerStyle}`} role="status" aria-live="polite">
                  {iconEl}
                  <div>
                    <p className="text-sm font-medium text-p-dark">{titulo}</p>
                    <p className="text-xs text-p-gray mt-0.5">{subtitulo}</p>
                  </div>
                </div>

                {tieneErrores && finalImportId && (
                  <button
                    type="button"
                    onClick={handleDownloadAnotado}
                    className="btn-secondary w-full justify-center mb-4"
                  >
                    <Download size={15} aria-hidden /> Descargar Excel anotado con errores
                  </button>
                )}

                <div className="pt-4 border-t border-p-border flex justify-end">
                  <button type="button" onClick={onClose} className="btn-primary">
                    Cerrar
                  </button>
                </div>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
