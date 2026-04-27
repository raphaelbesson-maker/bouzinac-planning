'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AppShell } from '@/components/shared/AppShell'
import type { UserRole } from '@/lib/types'

const ADMIN_TABS = [
  { href: '/admin/ofs', label: 'OFs' },
  { href: '/admin/gammes', label: 'Gammes' },
  { href: '/admin/machines', label: 'Machines' },
  { href: '/admin/operateurs', label: 'Opérateurs' },
  { href: '/admin/clients', label: 'Clients & Priorités' },
  { href: '/admin/regles', label: 'Règles' },
  { href: '/admin/import', label: 'Import CSV/Excel' },
  { href: '/admin/utilisateurs', label: 'Utilisateurs' },
]

interface AdminLayoutClientProps {
  children: React.ReactNode
  userName: string
  role: UserRole
}

export function AdminLayoutClient({ children, userName, role }: AdminLayoutClientProps) {
  const pathname = usePathname()

  return (
    <AppShell role={role} userName={userName}>
      <div className="flex h-[calc(100vh-64px)]">
        <aside className="w-48 flex-shrink-0 border-r border-slate-200 bg-white py-4">
          <nav className="space-y-1 px-2">
            {ADMIN_TABS.map((tab) => {
              const isActive = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </aside>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </AppShell>
  )
}
