'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Edit3, Save, X, Film, Loader2, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiRequest, compressVideo } from '@/lib/utils'
import { Animation, Category } from '@/types'
import { ConfirmDialog } from '@/components/ui/dialog'
import { AnimationCard } from '@/components/cards'

export default function AnimationManager() {
  const [animations, setAnimations] = useState<Animation[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryIds: [] as number[],
    videos: [] as File[],
    published: true,
  })
  const [videoPreviews, setVideoPreviews] = useState<string[]>([])
  const [existingVideos, setExistingVideos] = useState<string[]>([]) // Track original videos from server
  const [removedVideoIndices, setRemovedVideoIndices] = useState<Set<number>>(new Set()) // Track which original videos to remove
  const [modifiedVideos, setModifiedVideos] = useState<Map<number, File>>(new Map()) // Track which videos are modified by index
  const [addedVideos, setAddedVideos] = useState<File[]>([]) // Track newly added videos
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; animationId: number | null }>({
    open: false,
    animationId: null,
  })

  useEffect(() => {
    Promise.all([fetchCategories()])
  }, [])

  useEffect(() => {
    fetchAnimations()
  }, [currentPage, searchTerm, selectedCategoryIds])


  const fetchAnimations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      })

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }

      if (selectedCategoryIds.length > 0) {
        params.append('categoryIds', JSON.stringify(selectedCategoryIds))
      }

      const response = await apiRequest<{
        data: Animation[]
        pagination: {
          page: number
          limit: number
          total: number
          totalPages: number
          hasNextPage: boolean
          hasPrevPage: boolean
        }
      }>(`/animations/my?${params.toString()}`)

      setAnimations(response.data)
      setTotalItems(response.pagination.total)
      setTotalPages(response.pagination.totalPages)
    } catch (error) {
      console.error('Failed to fetch animations:', error)
      setAnimations([])
      setTotalItems(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const data = await apiRequest<Category[]>('/categories/my')
      setCategories(data)
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  const createAnimation = async () => {
    if (!formData.title.trim() || formData.videos.length === 0) return

    setSubmitting(true)
    try {
      const formDataToSend = new FormData()

      // Compress all videos and wait for completion
      const compressedVideos = await Promise.all(
        formData.videos.map(video => compressVideo(video))
      )

      // Append all compressed videos to FormData
      compressedVideos.forEach(compressedVideo => {
        formDataToSend.append('videos', compressedVideo)
      })

      formDataToSend.append('title', formData.title)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('categoryIds', JSON.stringify(formData.categoryIds))
      formDataToSend.append('published', formData.published.toString())

      await apiRequest<Animation>('/animations', {
        method: 'POST',
        body: formDataToSend,
      })

      resetForm()
      await fetchAnimations() // Refresh the list
    } catch (error) {
      console.error('Failed to create animation:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const updateAnimation = async (id: number) => {
    if (!formData.title.trim()) return

    setSubmitting(true)
    try {
      const formDataToSend = new FormData()

      // Compress modified videos and wait for completion
      if (modifiedVideos.size > 0) {
        const modifiedVideosArray = Array.from(modifiedVideos.entries())
        const compressedModified = await Promise.all(
          modifiedVideosArray.map(([_, file]) => compressVideo(file))
        )

        // Append compressed modified videos with their indices
        compressedModified.forEach((compressedVideo, i) => {
          const [index] = modifiedVideosArray[i]
          formDataToSend.append('modifiedVideos', compressedVideo)
          formDataToSend.append('modifiedVideoIndices', index.toString())
        })
      }

      // Compress newly added videos and wait for completion
      if (addedVideos.length > 0) {
        const compressedAdded = await Promise.all(
          addedVideos.map(file => compressVideo(file))
        )

        // Append all compressed added videos
        compressedAdded.forEach(compressedVideo => {
          formDataToSend.append('addedVideos', compressedVideo)
        })
      }

      // Send indices of removed existing videos
      if (removedVideoIndices.size > 0) {
        formDataToSend.append('removedVideoIndices', JSON.stringify(Array.from(removedVideoIndices)))
      }

      formDataToSend.append('title', formData.title)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('categoryIds', JSON.stringify(formData.categoryIds))
      formDataToSend.append('published', formData.published.toString())

      await apiRequest<Animation>(`/animations/${id}`, {
        method: 'PUT',
        body: formDataToSend,
      })

      resetForm()
      await fetchAnimations() // Refresh the list
    } catch (error) {
      console.error('Failed to update animation:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const showDeleteDialog = (id: number) => {
    setDeleteDialog({ open: true, animationId: id })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.animationId) return

    try {
      await apiRequest(`/animations/${deleteDialog.animationId}`, { method: 'DELETE' })
      await fetchAnimations() // Refresh the list
    } catch (error) {
      console.error('Failed to delete animation:', error)
    } finally {
      setDeleteDialog({ open: false, animationId: null })
    }
  }

  const startEdit = (animation: Animation) => {
    setEditingId(animation.id)
    setFormData({
      title: animation.title,
      description: animation.description || '',
      categoryIds: animation.animation_categories.map(pc => pc.category.id),
      videos: [],
      published: animation.published ?? true,
    })
    // Initialize editing state for videos
    setExistingVideos(animation.batch_video_path)
    setVideoPreviews(animation.batch_video_path)
    setRemovedVideoIndices(new Set())
    setModifiedVideos(new Map())
    setAddedVideos([])
    setShowCreateForm(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      categoryIds: [],
      videos: [],
      published: true,
    })
    setVideoPreviews([])
    setExistingVideos([])
    setRemovedVideoIndices(new Set())
    setModifiedVideos(new Map())
    setAddedVideos([])
    setShowCreateForm(false)
    setEditingId(null)
  }

  const handleCategoryToggle = (categoryId: number) => {
    setFormData(prev => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(categoryId)
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId]
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (typeof index === 'number') {
      // Single video replacement at specific index
      const file = files[0]
      const newPreviews = [...videoPreviews]
      const newModifiedVideos = new Map(modifiedVideos)

      // Track this video as modified
      newModifiedVideos.set(index, file)
      setModifiedVideos(newModifiedVideos)

      // Generate preview URL for the new video
      const videoUrl = URL.createObjectURL(file)
      newPreviews[index] = videoUrl
      setVideoPreviews(newPreviews)
    } else {
      // Multiple videos added to the end
      const currentPreviewCount = videoPreviews.length
      const newPreviews = [...videoPreviews]

      if (editingId) {
        // For editing: add to addedVideos array
        const newAddedVideos = [...addedVideos, ...files]
        setAddedVideos(newAddedVideos)
      } else {
        // For new animation creation: add to formData.videos
        const newVideos = [...formData.videos, ...files]
        setFormData({ ...formData, videos: newVideos })
      }

      // Generate preview URLs for all new video files
      files.forEach((file, fileIndex) => {
        const videoUrl = URL.createObjectURL(file)
        newPreviews[currentPreviewCount + fileIndex] = videoUrl
      })

      setVideoPreviews(newPreviews)
    }
  }

  const removeVideo = (indexToRemove: number) => {
    if (editingId) {
      if (indexToRemove < existingVideos.length) {
        // This is an existing video - mark it for removal (don't actually remove from arrays)
        const newRemovedIndices = new Set(removedVideoIndices)
        newRemovedIndices.add(indexToRemove)
        setRemovedVideoIndices(newRemovedIndices)

        // Remove from modified videos if it was modified
        const newModifiedVideos = new Map(modifiedVideos)
        newModifiedVideos.delete(indexToRemove)
        setModifiedVideos(newModifiedVideos)
      } else {
        // This is a newly added video - actually remove it
        const addedImageIndex = indexToRemove - existingVideos.length
        const newAddedVideos = addedVideos.filter((_, index) => index !== addedImageIndex)
        setAddedVideos(newAddedVideos)

        // Remove from UI preview for added videos
        const newPreviews = videoPreviews.filter((_, index) => index !== indexToRemove)
        setVideoPreviews(newPreviews)
      }
    } else {
      // For new animation creation - remove from formData.videos
      const newVideos = formData.videos.filter((_, index) => index !== indexToRemove)
      const newPreviews = videoPreviews.filter((_, index) => index !== indexToRemove)

      setFormData({ ...formData, videos: newVideos })
      setVideoPreviews(newPreviews)
    }
  }

  // Reset to first page when search/filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategoryIds])

  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Animations</h1>
            <p className="text-gray-600 mt-2">Manage your animation collections</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateForm(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Animation
            </Button>
          </div>
        </div>

        {/* Search and Filter */}
        {!showCreateForm && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full text-gray-900 placeholder-gray-500"
              />
            </div>
            <div className="relative w-full sm:w-64">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <button
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="pl-10 w-full h-10 px-3 py-2 border border-gray-300 bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left text-gray-900 flex items-center justify-between"
              >
                <span className="truncate">
                  {selectedCategoryIds.length === 0
                    ? 'All Categories'
                    : selectedCategoryIds.length === 1
                      ? categories.find(c => c.id === selectedCategoryIds[0])?.name
                      : `${selectedCategoryIds.length} categories selected`
                  }
                </span>
                <svg className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {categoryDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setSelectedCategoryIds([])
                        setCategoryDropdownOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded transition-colors text-gray-900"
                    >
                      Clear All
                    </button>
                    {categories.map(category => (
                      <label key={category.id} className="flex items-center px-3 py-2 text-sm hover:bg-gray-50 rounded transition-colors cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCategoryIds.includes(category.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategoryIds([...selectedCategoryIds, category.id])
                            } else {
                              setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== category.id))
                            }
                          }}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-gray-900">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {editingId ? 'Edit Animation' : 'Add New Animation'}
            </CardTitle>
            <CardDescription>
              {editingId ? 'Update animation details' : 'Create a new animation with multiple videos'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Animation title"
                  disabled={submitting}
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  Description
                </label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Animation description"
                  rows={3}
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Videos {!editingId && <span className="text-red-500">*</span>}
                </label>

                {/* Add Videos Button */}
                <div className="mb-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('add-videos')?.click()}
                    className="w-full sm:w-auto"
                    disabled={submitting}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Videos
                  </Button>
                  <input
                    id="add-videos"
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => handleImageChange(e)}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Select one or more videos to add to this animation
                  </p>
                </div>

                {/* Video Previews */}
                {videoPreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {videoPreviews
                      .map((preview, index) => ({ preview, index }))
                      .filter(({ index }) => !removedVideoIndices.has(index))
                      .map(({ preview, index }) => (
                        <div key={index} className="relative group">
                          <video
                            src={preview}
                            className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                            controls={false}
                            muted
                            loop
                            onMouseEnter={(e) => e.currentTarget.play()}
                            onMouseLeave={(e) => {
                              e.currentTarget.pause()
                              e.currentTarget.currentTime = 0
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeVideo(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => document.getElementById(`video-${index}`)?.click()}
                            className="absolute bottom-1 right-1 bg-blue-500 text-white rounded-full px-2 py-1 text-xs hover:bg-blue-600 transition-colors shadow-lg"
                          >
                            Change
                          </button>
                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                            {index + 1}
                          </div>
                          <input
                            id={`video-${index}`}
                            type="file"
                            accept="video/*"
                            onChange={(e) => handleImageChange(e, index)}
                            className="hidden"
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {categories.length > 0 ? (
                    categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleCategoryToggle(category.id)}
                        disabled={submitting}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${formData.categoryIds.includes(category.id)
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                          }`}
                      >
                        {category.name}
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500">No categories available</p>
                  )}
                </div>
              </div>

              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={submitting}
                  />
                  <span className="text-sm font-medium text-gray-700">Published</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">Uncheck to save as draft without publishing</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => editingId ? updateAnimation(editingId) : createAnimation()}
                  disabled={submitting || !formData.title.trim() || (!editingId && formData.videos.length === 0 && videoPreviews.length === 0)}
                  className="w-full sm:w-auto"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {submitting
                    ? (editingId ? 'Updating...' : 'Creating...')
                    : (editingId ? 'Update' : 'Create')
                  }
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!showCreateForm && (
        animations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                {searchTerm || selectedCategoryIds.length > 0 ? <Search className="w-12 h-12 mx-auto" /> : <Film className="w-12 h-12 mx-auto" />}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedCategoryIds.length > 0 ? 'No animations found' : 'No animations yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedCategoryIds.length > 0
                  ? 'No animations match your current search and filter criteria. Try adjusting your search terms or filters.'
                  : 'Create your first animation collection.'
                }
              </p>
              {!searchTerm && selectedCategoryIds.length === 0 && (
                <Button onClick={() => setShowCreateForm(true)} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Animation
                </Button>
              )}
            </CardContent>
          </Card>
        ) :
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
              {animations.map((animation) => (
                <AnimationCard
                  key={animation.id}
                  animation={animation}
                  onEdit={startEdit}
                  onDelete={showDeleteDialog}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-700">
                  Showing {startIndex + 1} to {endIndex} of {totalItems} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNumber
                      if (totalPages <= 5) {
                        pageNumber = i + 1
                      } else if (currentPage <= 3) {
                        pageNumber = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + i
                      } else {
                        pageNumber = currentPage - 2 + i
                      }

                      return (
                        <Button
                          key={pageNumber}
                          variant={currentPage === pageNumber ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNumber)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNumber}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
      )}

      {!showCreateForm && animations.length > 0 && totalPages <= 1 && (
        <div className="mt-6 text-center text-sm text-gray-500">
          Showing {totalItems} animation{totalItems !== 1 ? 's' : ''}
        </div>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, animationId: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Animation"
        message="Are you sure you want to delete this animation? This action cannot be undone."
      />
    </div>
  )
}