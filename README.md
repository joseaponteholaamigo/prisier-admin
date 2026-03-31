# Prisier Admin

Backoffice de la plataforma Prisier — React SPA para administradores y consultores.

**URL produccion:** `admin.prisier.com`

## Stack

- React 18 + TypeScript
- Vite 8
- Tailwind CSS 3
- React Router DOM
- TanStack React Query + Axios
- React Hook Form + Zod
- Plotly.js (graficos)
- Lucide React (iconos)

## Requisitos

- Node.js 22+
- npm

## Inicio rapido

```bash
npm install
npm run dev
```

Disponible en `http://localhost:5173`

## Build de produccion

```bash
npm run build
```

Los archivos estaticos se generan en `dist/`.

## Docker (produccion)

```bash
docker compose up -d
```

Sirve la app con nginx en el puerto `3001`.

## Roles con acceso

- `admin` — gestion completa de la plataforma
- `consultor_pricer` — gestion de tenants asignados y sus usuarios
