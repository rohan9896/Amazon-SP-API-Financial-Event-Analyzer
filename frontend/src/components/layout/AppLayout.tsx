import { NavLink, Outlet } from 'react-router-dom'
import { Banknote, ClipboardList, Scale } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const nav = [
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/finances', label: 'Finances', icon: Banknote },
  { to: '/reconciliation', label: 'Reconciliation', icon: Scale },
]

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card px-3 py-5">
        <div className="px-2 pb-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            SP-API Analyzer
          </p>
          <h1 className="mt-1 text-base font-semibold text-foreground">Seller Dashboard</h1>
        </div>
        <Separator className="mb-3" />
        <nav className="flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-2 pt-6 text-xs text-muted-foreground">
          Data from reconciliation-api
        </p>
      </aside>
      <main className="flex-1 overflow-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
