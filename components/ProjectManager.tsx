'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Edit3, Save, X, FolderOpen, Loader2, Search, Filter, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { apiRequest, compressImage } from '@/lib/utils'
import { Project, Category } from '@/types'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useDrafts } from '@/hooks/useDrafts'

interface ProjectDraftData {
  title: string
  description: string
  categoryIds: number[]
  type: 'portfolio' | 'scratch'
  imagePreviews: string[]
}

export default function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([])
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
  const [selectedType, setSelectedType] = useState<'all' | 'portfolio' | 'scratch'>('all')
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryIds: [] as number[],
    images: [] as File[],
    type: 'portfolio' as 'portfolio' | 'scratch',
  })
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([]) // Track original images from server
  const [removedImageIndices, setRemovedImageIndices] = useState<Set<number>>(new Set()) // Track which original images to remove
  const [modifiedImages, setModifiedImages] = useState<Map<number, File>>(new Map()) // Track which images are modified by index
  const [addedImages, setAddedImages] = useState<File[]>([]) // Track newly added images
  const { drafts, showDraftList, setShowDraftList, saveDraft, restoreDraft, deleteDraft, activeDraftId, setActiveDraftId } = useDrafts<ProjectDraftData>('project_drafts')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; projectId: number | null }>({
    open: false,
    projectId: null,
  })

  useEffect(() => {
    Promise.all([fetchCategories()])
  }, [])

  useEffect(() => {
    fetchProjects()
  }, [currentPage, searchTerm, selectedCategoryIds, selectedType])


  const fetchProjects = async () => {
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

      if (selectedType !== 'all') {
        params.append('type', selectedType)
      }

      const response = await apiRequest<{
        data: Project[]
        pagination: {
          page: number
          limit: number
          total: number
          totalPages: number
          hasNextPage: boolean
          hasPrevPage: boolean
        }
      }>(`/projects/my?${params.toString()}`)

      setProjects(response.data)
      setTotalItems(response.pagination.total)
      setTotalPages(response.pagination.totalPages)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      setProjects([])
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
    } finally {
      setLoading(false)
    }
  }

  const createProject = async () => {
    if (!formData.title.trim() || formData.images.length === 0) return

    setSubmitting(true)
    try {
      const formDataToSend = new FormData()

      // Compress all images and wait for completion
      const compressedImages = await Promise.all(
        formData.images.map(image => compressImage(image))
      )

      // Append all compressed images to FormData
      compressedImages.forEach(compressedImage => {
        formDataToSend.append('images', compressedImage)
      })

      formDataToSend.append('title', formData.title)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('categoryIds', JSON.stringify(formData.categoryIds))
      formDataToSend.append('type', formData.type)

      await apiRequest<Project>('/projects', {
        method: 'POST',
        body: formDataToSend,
      })

      resetForm()
      await fetchProjects() // Refresh the list
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const updateProject = async (id: number) => {
    if (!formData.title.trim()) return

    setSubmitting(true)
    try {
      const formDataToSend = new FormData()

      // Compress modified images and wait for completion
      if (modifiedImages.size > 0) {
        const modifiedImagesArray = Array.from(modifiedImages.entries())
        const compressedModified = await Promise.all(
          modifiedImagesArray.map(([_, file]) => compressImage(file))
        )

        // Append compressed modified images with their indices
        compressedModified.forEach((compressedImage, i) => {
          const [index] = modifiedImagesArray[i]
          formDataToSend.append('modifiedImages', compressedImage)
          formDataToSend.append('modifiedImageIndices', index.toString())
        })
      }

      // Compress newly added images and wait for completion
      if (addedImages.length > 0) {
        const compressedAdded = await Promise.all(
          addedImages.map(file => compressImage(file))
        )

        // Append all compressed added images
        compressedAdded.forEach(compressedImage => {
          formDataToSend.append('addedImages', compressedImage)
        })
      }

      // Send indices of removed existing images
      if (removedImageIndices.size > 0) {
        formDataToSend.append('removedImageIndices', JSON.stringify(Array.from(removedImageIndices)))
      }

      formDataToSend.append('title', formData.title)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('categoryIds', JSON.stringify(formData.categoryIds))
      formDataToSend.append('type', formData.type)

      await apiRequest<Project>(`/projects/${id}`, {
        method: 'PUT',
        body: formDataToSend,
      })

      resetForm()
      await fetchProjects() // Refresh the list
    } catch (error) {
      console.error('Failed to update project:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const showDeleteDialog = (id: number) => {
    setDeleteDialog({ open: true, projectId: id })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.projectId) return

    try {
      await apiRequest(`/projects/${deleteDialog.projectId}`, { method: 'DELETE' })
      await fetchProjects() // Refresh the list
    } catch (error) {
      console.error('Failed to delete project:', error)
    } finally {
      setDeleteDialog({ open: false, projectId: null })
    }
  }

  const startEdit = (project: Project) => {
    setEditingId(project.id)
    setFormData({
      title: project.title,
      description: project.description || '',
      categoryIds: project.project_categories.map(pc => pc.category.id),
      images: [],
      type: project.type || 'portfolio',
    })
    // Initialize editing state for images
    setExistingImages(project.batch_image_path)
    setImagePreviews(project.batch_image_path)
    setRemovedImageIndices(new Set())
    setModifiedImages(new Map())
    setAddedImages([])
    setShowCreateForm(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      categoryIds: [],
      images: [],
      type: 'portfolio',
    })
    setImagePreviews([])
    setExistingImages([])
    setRemovedImageIndices(new Set())
    setModifiedImages(new Map())
    setAddedImages([])
    setShowCreateForm(false)
    setEditingId(null)
    setActiveDraftId(null)
  }

  const saveNewDraft = () => {
    const draftName = formData.title.trim() || `Draft ${new Date().toLocaleString()}`
    const draftData: ProjectDraftData = {
      title: formData.title,
      description: formData.description,
      categoryIds: formData.categoryIds,
      type: formData.type,
      imagePreviews: imagePreviews,
    }
    saveDraft(draftName, draftData, activeDraftId || undefined)
    resetForm()
  }

  const handleRestoreDraft = (draftId: string) => {
    const draftData = restoreDraft(draftId)
    if (draftData) {
      setFormData({
        title: draftData.title || '',
        description: draftData.description || '',
        categoryIds: draftData.categoryIds || [],
        images: [],
        type: draftData.type || 'portfolio',
      })
      setImagePreviews(draftData.imagePreviews || [])
      setShowCreateForm(true)
      setShowDraftList(false)
    }
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
      // Single image replacement at specific index
      const file = files[0]
      const newPreviews = [...imagePreviews]
      const newModifiedImages = new Map(modifiedImages)

      // Track this image as modified
      newModifiedImages.set(index, file)
      setModifiedImages(newModifiedImages)

      // Generate preview for the new image
      const reader = new FileReader()
      reader.onload = (e) => {
        newPreviews[index] = e.target?.result as string
        setImagePreviews(newPreviews)
      }
      reader.readAsDataURL(file)
    } else {
      // Multiple images added to the end
      const currentPreviewCount = imagePreviews.length
      const newPreviews = [...imagePreviews]

      if (editingId) {
        // For editing: add to addedImages array
        const newAddedImages = [...addedImages, ...files]
        setAddedImages(newAddedImages)
      } else {
        // For new project creation: add to formData.images
        const newImages = [...formData.images, ...files]
        setFormData({ ...formData, images: newImages })
      }

      // Generate previews for all new files
      let loadedCount = 0
      files.forEach((file, fileIndex) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          newPreviews[currentPreviewCount + fileIndex] = e.target?.result as string
          loadedCount++

          // Update state when all files are loaded
          if (loadedCount === files.length) {
            setImagePreviews(newPreviews)
          }
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const removeImage = (indexToRemove: number) => {
    if (editingId) {
      if (indexToRemove < existingImages.length) {
        // This is an existing image - mark it for removal (don't actually remove from arrays)
        const newRemovedIndices = new Set(removedImageIndices)
        newRemovedIndices.add(indexToRemove)
        setRemovedImageIndices(newRemovedIndices)

        // Remove from modified images if it was modified
        const newModifiedImages = new Map(modifiedImages)
        newModifiedImages.delete(indexToRemove)
        setModifiedImages(newModifiedImages)
      } else {
        // This is a newly added image - actually remove it
        const addedImageIndex = indexToRemove - existingImages.length
        const newAddedImages = addedImages.filter((_, index) => index !== addedImageIndex)
        setAddedImages(newAddedImages)

        // Remove from UI preview for added images
        const newPreviews = imagePreviews.filter((_, index) => index !== indexToRemove)
        setImagePreviews(newPreviews)
      }
    } else {
      // For new project creation - remove from formData.images
      const newImages = formData.images.filter((_, index) => index !== indexToRemove)
      const newPreviews = imagePreviews.filter((_, index) => index !== indexToRemove)

      setFormData({ ...formData, images: newImages })
      setImagePreviews(newPreviews)
    }
  }

  // Reset to first page when search/filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategoryIds, selectedType])

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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600 mt-2">Manage your project collections</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateForm(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
            {drafts.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowDraftList(!showDraftList)}
                className="w-full sm:w-auto"
              >
                <FileText className="w-4 h-4 mr-2" />
                Drafts ({drafts.length})
              </Button>
            )}
          </div>
        </div>

        {/* Drafts List */}
        {showDraftList && drafts.length > 0 && !showCreateForm && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg text-blue-900">Saved Drafts</CardTitle>
              <CardDescription className="text-blue-700">
                Click on a draft to restore it and continue working
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{draft.name}</h4>
                      <p className="text-sm text-gray-600 truncate">
                        {draft.data?.description || 'No description'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Saved: {new Date(draft.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => handleRestoreDraft(draft.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteDraft(draft.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
            <div className="relative w-full sm:w-48">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <button
                onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                className="pl-10 w-full h-10 px-3 py-2 border border-gray-300 bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left text-gray-900 flex items-center justify-between"
              >
                <span className="truncate">
                  {selectedType === 'all' ? 'All Types' : selectedType === 'portfolio' ? 'Portfolio' : 'Scratch'}
                </span>
                <svg className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {typeDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setSelectedType('all')
                        setTypeDropdownOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded transition-colors ${selectedType === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                        }`}
                    >
                      All Types
                    </button>
                    <button
                      onClick={() => {
                        setSelectedType('portfolio')
                        setTypeDropdownOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded transition-colors ${selectedType === 'portfolio' ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                        }`}
                    >
                      Portfolio
                    </button>
                    <button
                      onClick={() => {
                        setSelectedType('scratch')
                        setTypeDropdownOpen(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded transition-colors ${selectedType === 'scratch' ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                        }`}
                    >
                      Scratch
                    </button>
                  </div>
                </div>
              )}
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
              {editingId ? 'Edit Project' : 'Add New Project'}
            </CardTitle>
            <CardDescription>
              {editingId ? 'Update project details' : 'Create a new project with multiple images'}
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
                  placeholder="Project title"
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
                  placeholder="Project description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Images {!editingId && <span className="text-red-500">*</span>}
                </label>

                {/* Add Images Button */}
                <div className="mb-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('add-images')?.click()}
                    className="w-full sm:w-auto"
                    disabled={submitting}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Images
                  </Button>
                  <input
                    id="add-images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageChange(e)}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Select one or more images to add to this project
                  </p>
                </div>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {imagePreviews
                      .map((preview, index) => ({ preview, index }))
                      .filter(({ index }) => !removedImageIndices.has(index))
                      .map(({ preview, index }) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Image ${index + 1}`}
                            className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => document.getElementById(`image-${index}`)?.click()}
                            className="absolute bottom-1 right-1 bg-blue-500 text-white rounded-full px-2 py-1 text-xs hover:bg-blue-600 transition-colors shadow-lg"
                          >
                            Change
                          </button>
                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                            {index + 1}
                          </div>
                          <input
                            id={`image-${index}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageChange(e, index)}
                            className="hidden"
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Type <span className="text-red-500">*</span></label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="portfolio"
                      checked={formData.type === 'portfolio'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'portfolio' | 'scratch' })}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Portfolio</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="type"
                      value="scratch"
                      checked={formData.type === 'scratch'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'portfolio' | 'scratch' })}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">Scratch</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategoryToggle(category.id)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${formData.categoryIds.includes(category.id)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                        }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => editingId ? updateProject(editingId) : createProject()}
                  disabled={submitting || !formData.title.trim() || (!editingId && formData.images.length === 0)}
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
                {!editingId && (
                  <Button
                    variant="secondary"
                    onClick={saveNewDraft}
                    disabled={submitting || !formData.title.trim()}
                    className="w-full sm:w-auto"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Save to Draft
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="w-full sm:w-auto"
                  disabled={submitting}
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
        projects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                {searchTerm || selectedCategoryIds.length > 0 || selectedType !== 'all' ? <Search className="w-12 h-12 mx-auto" /> : <FolderOpen className="w-12 h-12 mx-auto" />}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedCategoryIds.length > 0 || selectedType !== 'all' ? 'No projects found' : 'No projects yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedCategoryIds.length > 0 || selectedType !== 'all'
                  ? 'No projects match your current search and filter criteria. Try adjusting your search terms or filters.'
                  : 'Create your first project collection.'
                }
              </p>
              {!searchTerm && selectedCategoryIds.length === 0 && (
                <Button onClick={() => setShowCreateForm(true)} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Project
                </Button>
              )}
            </CardContent>
          </Card>
        ) :
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="overflow-hidden">
                  <div className="aspect-video bg-gray-100 relative">
                    {/* Image count badge in top-right */}
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10">
                      {project.batch_image_path.length} images
                    </div>
                    <div className="aspect-square bg-gray-100 relative">
                      <img
                        src={project.batch_image_path[0]}
                        alt={project.title || 'Untitled'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-image.svg'
                        }}
                      />
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between mb-2">
                      <div className="flex flex-col">
                        <h3 className="font-medium text-md line-clamp-1 mr-2">
                          {project.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${project.type === 'portfolio'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                          }`}>
                          {project.type === 'portfolio' ? 'Portfolio' : 'Scratch'}
                        </span>
                        <p className="text-sm text-gray-600">
                          {project.description || ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-center space-y-2">
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(project.updated_at || project.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(project)} className="flex-1 sm:flex-none">
                            <Edit3 className="w-4 h-4 sm:mr-0 mr-2" />
                            <span className="sm:hidden">Edit</span>
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => showDeleteDialog(project.id)} className="flex-1 sm:flex-none">
                            <Trash2 className="w-4 h-4 sm:mr-0 mr-2" />
                            <span className="sm:hidden">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 min-h-6 mt-8">
                      {project.project_categories.length > 0 ?
                        project.project_categories.map((pc) => (
                          <span
                            key={pc.category.id}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                          >
                            {pc.category.name}
                          </span>
                        ))
                        : <span
                          className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full"
                        >
                          No Categories
                        </span>
                      }
                    </div>
                  </CardContent>
                </Card>
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

      {!showCreateForm && projects.length > 0 && totalPages <= 1 && (
        <div className="mt-6 text-center text-sm text-gray-500">
          Showing {totalItems} project{totalItems !== 1 ? 's' : ''}
        </div>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, projectId: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
      />
    </div>
  )
}