'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import LoginForm from './auth/LoginForm'
import Sidebar from './Sidebar'
import Dashboard from './dashboard/Dashboard'
import CategoryManager from './managers/CategoryManager'
import ArtworkManager from './managers/ArtworkManager'
import ProjectManager from './managers/ProjectManager'
import AnimationManager from './managers/AnimationManager'
import ProfileManager from './managers/ProfileManager'

export default function CMS() {
  const { user, loading } = useAuth()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Load saved section from localStorage on mount
  useEffect(() => {
    const savedSection = localStorage.getItem('cms_active_section')
    if (savedSection) {
      setActiveSection(savedSection)
    }
  }, [])

  // Save active section to localStorage whenever it changes
  const handleSectionChange = (section: string) => {
    setActiveSection(section)
    localStorage.setItem('cms_active_section', section)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard onSectionChange={handleSectionChange} />
      case 'categories':
        return <CategoryManager />
      case 'artworks':
        return <ArtworkManager />
      case 'projects':
        return <ProjectManager />
      case 'animations':
        return <AnimationManager />
      case 'profile':
        return <ProfileManager />
      default:
        return <Dashboard onSectionChange={handleSectionChange} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 lg:ml-0">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-900 hover:text-gray-700 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-900">Meng</h1>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>
        {renderContent()}
      </main>
    </div>
  )
}