// ─── Especificaciones de plantillas Excel por tipo ───────────────────────────
// Nombre canónico de la hoja y headers de primera fila, en el orden esperado.
// Usados tanto para validación frontend ligera como para descarga de plantillas.

import type { TipoPlantilla } from './types'

export interface TemplateSpec {
  sheetName: string
  headers: string[]
  label: string           // label legible para mensajes al usuario
}

export const TEMPLATE_SPECS: Record<TipoPlantilla, TemplateSpec> = {
  portafolio: {
    sheetName: 'Portafolio',
    headers: ['EAN', 'SKU', 'Producto', 'Marca', 'Categoría', 'PVP Sugerido', 'Costo Variable', 'Peso Profit Pool', 'IVA'],
    label: 'Portafolio',
  },
  categorias: {
    sheetName: 'Categorías',
    headers: ['Categoría', 'IVA (%)'],
    label: 'Categorías',
  },
  competidores: {
    sheetName: 'Competidores',
    headers: ['EAN Propio', 'EAN Competidor', 'Tipo Competidor', 'Marca Competidor', 'Retailer', 'País', 'Es Principal'],
    label: 'Competidores',
  },
  atributos: {
    sheetName: 'Atributos',
    headers: ['Categoría', 'Atributo', 'Peso (%)'],
    label: 'Atributos',
  },
  // FIXME 2026-04-28: doc 02 §8 dice formato largo (4 cols), código usa formato ancho (5 cols).
  // Decisión funcional pendiente con José antes de unificar.
  calificaciones: {
    sheetName: 'Calificaciones',
    headers: ['EAN', 'Atributo', 'Calificación Propia', 'Competidor', 'Calificación Competidor'],
    label: 'Calificaciones',
  },
  elasticidad: {
    sheetName: 'Elasticidad',
    headers: ['EAN', 'Coeficiente Elasticidad'],
    label: 'Elasticidad',
  },
  canales: {
    sheetName: 'Canales',
    headers: ['Canal', 'Categoría', 'Margen (%)'],
    label: 'Canales',
  },
  competencia: {
    sheetName: 'Competencia',
    headers: ['EAN', 'Producto', 'Marca', 'Categoría', 'PVP Referencia'],
    label: 'Competencia (SKUs)',
  },
}

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024   // 10 MB estricto (< 10 MB)
