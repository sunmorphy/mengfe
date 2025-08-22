'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, BarChart3, ChevronDown } from 'lucide-react'
import { apiRequest } from '@/lib/utils'
import { Artwork, Project } from '@/types'

interface ProductivityData {
  month: number
  monthName: string
  artworks: number
  projects: number
  total: number
}

interface ProductivityChartProps {
  className?: string
}

export default function ProductivityChart({ className }: ProductivityChartProps) {
  const [data, setData] = useState<ProductivityData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false)

  useEffect(() => {
    fetchAnnualProductivityData()
  }, [selectedYear])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.custom-dropdown')) {
        setYearDropdownOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const fetchAnnualProductivityData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch all artworks and projects for the selected year (no pagination needed for chart data)
      const [artworksResponse, projectsResponse] = await Promise.all([
        apiRequest<{data: Artwork[], pagination: {total: number}}>('/artworks?limit=1000'), // Get all artworks
        apiRequest<{data: Project[], pagination: {total: number}}>('/projects?limit=1000')   // Get all projects
      ])
      
      const artworks = artworksResponse.data
      const projects = projectsResponse.data
      
      // Process the data to get monthly counts for the selected year
      const monthlyCounts: { [month: number]: { artworks: number; projects: number } } = {}
      
      // Initialize all months with 0 counts
      for (let month = 0; month < 12; month++) {
        monthlyCounts[month] = { artworks: 0, projects: 0 }
      }
      
      // Count artworks created in the selected year
      artworks.forEach(artwork => {
        const createdDate = new Date(artwork.created_at)
        if (createdDate.getFullYear() === selectedYear) {
          const month = createdDate.getMonth()
          monthlyCounts[month].artworks++
        }
      })
      
      // Count projects created in the selected year
      projects.forEach(project => {
        const createdDate = new Date(project.created_at)
        if (createdDate.getFullYear() === selectedYear) {
          const month = createdDate.getMonth()
          monthlyCounts[month].projects++
        }
      })
      
      // Convert to ProductivityData array
      const annualData: ProductivityData[] = []
      for (let month = 0; month < 12; month++) {
        const { artworks: artworkCount, projects: projectCount } = monthlyCounts[month]
        annualData.push({
          month,
          monthName: months[month],
          artworks: artworkCount,
          projects: projectCount,
          total: artworkCount + projectCount
        })
      }
      
      setData(annualData)
    } catch (err) {
      console.error('Failed to fetch productivity data:', err)
      setError('Failed to load productivity data')
    } finally {
      setLoading(false)
    }
  }

  const maxValue = Math.max(...data.map(d => d.total), 1)
  const totalArtworks = data.reduce((sum, d) => sum + d.artworks, 0)
  const totalProjects = data.reduce((sum, d) => sum + d.projects, 0)
  const avgMonthly = data.length > 0 ? (totalArtworks + totalProjects) / data.length : 0
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)
  
  const getYearLabel = () => {
    return selectedYear.toString()
  }

  const handleYearSelect = (year: number) => {
    setSelectedYear(year)
    setYearDropdownOpen(false)
  }

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Annual Productivity Tracker
              </CardTitle>
              <CardDescription>Loading productivity data...</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <div className="h-8 w-12 bg-gray-200 rounded mx-auto mb-1"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded mx-auto"></div>
                </div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="flex justify-center gap-6">
              <div className="h-4 w-20 bg-gray-200 rounded"></div>
              <div className="h-4 w-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Annual Productivity Tracker
              </CardTitle>
              <CardDescription className="text-red-600">{error}</CardDescription>
            </div>
            <div className="flex gap-2">
              {/* Year Dropdown */}
              <div className="relative custom-dropdown">
                <button
                  onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                  className="bg-gray-100 text-gray-700 px-3 py-1 text-sm rounded-md pr-8 hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-2 min-w-20"
                >
                  <span>{selectedYear}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${yearDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {yearDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-full max-h-60 overflow-y-auto">
                    {years.map((year) => (
                      <button
                        key={year}
                        onClick={() => handleYearSelect(year)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          year === selectedYear ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Unable to load productivity data</p>
            <button 
              onClick={() => fetchAnnualProductivityData()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Annual Productivity Tracker
            </CardTitle>
            <CardDescription>
              Track your creative output for {getYearLabel()}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {/* Year Dropdown */}
            <div className="relative custom-dropdown">
              <button
                onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                className="bg-gray-100 text-gray-700 px-3 py-1 text-sm rounded-md pr-8 hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-2 min-w-20"
              >
                <span>{selectedYear}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${yearDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {yearDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-full max-h-60 overflow-y-auto">
                  {years.map((year) => (
                    <button
                      key={year}
                      onClick={() => handleYearSelect(year)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        year === selectedYear ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalArtworks}</div>
            <div className="text-xs text-gray-600">Artworks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalProjects}</div>
            <div className="text-xs text-gray-600">Projects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{avgMonthly.toFixed(1)}</div>
            <div className="text-xs text-gray-600">Avg/Month</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64 w-full">
          <svg viewBox="0 0 800 200" className="w-full h-full">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
              <line
                key={ratio}
                x1="0"
                y1={180 - ratio * 160}
                x2="800"
                y2={180 - ratio * 160}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray={ratio === 1 ? "none" : "2,2"}
              />
            ))}

            {/* Line Chart */}
            {(() => {
              // Generate line paths
              const artworkPath = data.map((item, index) => {
                const x = (index * 800) / (data.length - 1)
                const y = 180 - (item.artworks / maxValue) * 160
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
              }).join(' ')
              
              const projectPath = data.map((item, index) => {
                const x = (index * 800) / (data.length - 1)
                const y = 180 - (item.projects / maxValue) * 160
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
              }).join(' ')
              
              return (
                <g>
                  {/* Artwork line */}
                  <path
                    d={artworkPath}
                    stroke="#3b82f6"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-sm"
                  />
                  
                  {/* Project line */}
                  <path
                    d={projectPath}
                    stroke="#10b981"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="drop-shadow-sm"
                  />
                  
                  {/* Data points and labels */}
                  {data.map((item, index) => {
                    const x = (index * 800) / (data.length - 1)
                    const artworkY = 180 - (item.artworks / maxValue) * 160
                    const projectY = 180 - (item.projects / maxValue) * 160
                    
                    return (
                      <g key={item.month}>
                        {/* Artwork data point */}
                        <circle
                          cx={x}
                          cy={artworkY}
                          r="4"
                          fill="#3b82f6"
                          stroke="white"
                          strokeWidth="2"
                          className="hover:r-6 transition-all cursor-pointer drop-shadow-sm"
                        >
                          <title>{item.monthName}: {item.artworks} artworks</title>
                        </circle>
                        
                        {/* Project data point */}
                        <circle
                          cx={x}
                          cy={projectY}
                          r="4"
                          fill="#10b981"
                          stroke="white"
                          strokeWidth="2"
                          className="hover:r-6 transition-all cursor-pointer drop-shadow-sm"
                        >
                          <title>{item.monthName}: {item.projects} projects</title>
                        </circle>
                        
                        {/* Month label */}
                        <text
                          x={x}
                          y={195}
                          textAnchor="middle"
                          className="fill-gray-600 text-[10px]"
                        >
                          {item.monthName.substring(0, 3)}
                        </text>
                      </g>
                    )
                  })}
                </g>
              )
            })()}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-blue-500 rounded-full"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full -ml-1 border border-white"></div>
            </div>
            <span className="text-sm text-gray-600">Artworks</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <div className="w-4 h-0.5 bg-green-500 rounded-full"></div>
              <div className="w-2 h-2 bg-green-500 rounded-full -ml-1 border border-white"></div>
            </div>
            <span className="text-sm text-gray-600">Projects</span>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Productivity Insights</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            {totalArtworks + totalProjects === 0
              ? `No activity recorded for ${getYearLabel()}. Start creating to see your productivity trends!`
              : avgMonthly >= 10
              ? "Excellent productivity! You're consistently creating content throughout the year."
              : avgMonthly >= 5
              ? "Great progress! You're maintaining good creative momentum."
              : avgMonthly >= 2
              ? "You're making steady progress. Consider setting monthly goals to boost your output."
              : "Low activity this year. Try setting small monthly goals to build consistent momentum."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}