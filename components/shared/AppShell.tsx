'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/lib/types'

const ROLE_LABELS: Record<UserRole, string> = {
  Admin: 'Direction',
  ADV: 'Commerce',
  Atelier: 'Atelier',
}

const ROLE_COLORS: Record<UserRole, string> = {
  Admin: 'bg-purple-100 text-purple-800',
  ADV: 'bg-blue-100 text-blue-800',
  Atelier: 'bg-green-100 text-green-800',
}

interface NavItem {
  href: string
  label: string
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/planning', label: 'Planning Atelier', roles: ['Admin', 'Atelier'] },
  { href: '/simulateur', label: 'Simulateur SAV', roles: ['Admin', 'ADV'] },
  { href: '/admin', label: 'Administration', roles: ['Admin'] },
]

interface AppShellProps {
  children: React.ReactNode
  role: UserRole
  userName: string
}

export function AppShell({ children, role, userName }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-8">
            <span className="font-bold text-xl text-slate-900">Bouzinac</span>
            <nav className="flex items-center gap-1">
              {visibleNav.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] flex items-center ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{userName}</span>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLORS[role]}`}
            >
              {ROLE_LABELS[role]}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-9"
            >
              Déconnexion
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
