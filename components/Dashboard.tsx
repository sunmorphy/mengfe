'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Image, FolderOpen, Tag, TrendingUp } from 'lucide-react'
import { apiRequest } from '@/lib/utils'
import { Artwork, Project, Category } from '@/types'
import ProductivityChart from '@/components/ProductivityChart'

interface DashboardProps {
  onSectionChange?: (section: string) => void
}

export default function Dashboard({ onSectionChange }: DashboardProps) {
  const [stats, setStats] = useState({
    artworks: 0,
    projects: 0,
    categories: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [artworksResponse, projectsResponse, categories] = await Promise.all([
        apiRequest<{ data: Artwork[], pagination: { total: number } }>('/artworks/my?limit=1000'),
        apiRequest<{ data: Project[], pagination: { total: number } }>('/projects/my?limit=1000'),
        apiRequest<Category[]>('/categories'),
      ])

      setStats({
        artworks: artworksResponse.pagination.total,
        projects: projectsResponse.pagination.total,
        categories: categories.length,
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statsCards = [
    {
      title: 'Total Artworks',
      value: stats.artworks,
      description: 'Individual art pieces',
      icon: Image,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Projects',
      value: stats.projects,
      description: 'Project collections',
      icon: FolderOpen,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Categories',
      value: stats.categories,
      description: 'Content categories',
      icon: Tag,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to your content management system</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
        {statsCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <div className={`${card.bgColor} ${card.color} p-2 rounded-md`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Productivity Chart */}
      <div className="mb-8">
        <ProductivityChart />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Common tasks you might want to perform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onSectionChange?.('artworks')}
            >
              <Image className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-medium">Add New Artwork</h3>
              <p className="text-sm text-gray-600">Upload a new art piece</p>
            </div>
            <div
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onSectionChange?.('projects')}
            >
              <FolderOpen className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-medium">Create Project</h3>
              <p className="text-sm text-gray-600">Start a new project collection</p>
            </div>
            <div
              className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => onSectionChange?.('categories')}
            >
              <Tag className="h-8 w-8 text-purple-600 mb-2" />
              <h3 className="font-medium">Manage Categories</h3>
              <p className="text-sm text-gray-600">Organize your content</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}