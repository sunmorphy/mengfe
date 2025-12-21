'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Home,
  Image,
  FolderOpen,
  Film,
  Tag,
  User,
  LogOut
} from 'lucide-react'

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ activeSection, onSectionChange, isOpen = true, onClose }: SidebarProps) {
  const { user, logout } = useAuth()

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'artworks', label: 'Artworks', icon: Image },
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'animations', label: 'Animations', icon: Film },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'profile', label: 'Profile', icon: User },
  ]

  const handleMenuClick = (sectionId: string) => {
    onSectionChange(sectionId)
    if (onClose) {
      onClose()
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`${isOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed lg:static lg:translate-x-0 inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white min-h-screen flex flex-col transition-transform duration-300 ease-in-out`}>
        <div className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold">Meng</h2>
          <p className="text-slate-300 text-xs md:text-sm mt-1">Awooo, {user?.username}!</p>
        </div>

        <nav className="flex-1 px-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${activeSection === item.id
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <Button
            onClick={logout}
            variant="ghost"
            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </>
  )
}