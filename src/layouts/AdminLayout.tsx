import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Building2, Settings, FileText, LogOut, Search } from 'lucide-react'
import { useAuth } from '../lib/auth'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Tenants', icon: Building2, path: '/tenants' },
  { label: 'Usuarios', icon: Users, path: '/usuarios' },
  { label: 'Reglas', icon: Settings, path: '/reglas' },
  { label: 'Auditoría', icon: FileText, path: '/auditoria' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const currentPage = navItems.find(i => i.path === location.pathname)

  return (
    <div className="flex h-screen bg-p-bg">
      {/* Sidebar */}
      <aside className="w-[220px] flex flex-col bg-p-sidebar border-r border-p-border">
        {/* Logo */}
        <div className="px-5 pt-6 pb-5">
          <div className="bg-white border border-p-border rounded-lg px-3 py-2 inline-block">
            <img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="Prisier" className="h-[36px] object-contain" />
          </div>
        </div>

        {/* Tenant selector placeholder */}
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-p-lime-border bg-p-lime-bg text-sm font-medium text-p-dark">
            <Building2 size={14} className="text-p-lime" />
            <span className="truncate">Admin</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item-active' : ''}`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-p-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-p-lime flex items-center justify-center text-p-dark font-bold text-xs">
              {user?.nombreCompleto?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-p-dark truncate">{user?.nombreCompleto}</p>
              <p className="text-xs text-p-gray truncate capitalize">{user?.rol?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={logout}
              className="text-p-gray hover:text-p-red transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-8 py-5 flex items-center justify-between bg-white border-b border-p-border">
          <div>
            <h1 className="text-xl font-bold text-p-dark">
              {currentPage?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-p-border bg-p-bg">
              <Search size={15} className="text-p-muted" />
              <input
                type="text"
                placeholder="Buscar..."
                className="bg-transparent border-none text-sm text-p-dark outline-none w-[160px] placeholder:text-p-muted"
              />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
