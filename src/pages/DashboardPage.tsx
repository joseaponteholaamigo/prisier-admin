import { Building2, Users, Package, DollarSign } from 'lucide-react'

const stats = [
  { label: 'Tenants activos', value: '1', icon: Building2, color: 'text-p-lime' },
  { label: 'Usuarios totales', value: '3', icon: Users, color: 'text-p-blue' },
  { label: 'SKUs registrados', value: '10', icon: Package, color: 'text-p-dark' },
  { label: 'Precios capturados', value: '252', icon: DollarSign, color: 'text-p-lime' },
]

export default function DashboardPage() {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map(s => (
          <div key={s.label} className="card p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-p-gray">{s.label}</p>
              <s.icon size={20} className={s.color} />
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
