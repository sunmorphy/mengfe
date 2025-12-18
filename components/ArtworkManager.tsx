'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Edit3, Save, X, Image as ImageIcon, Loader2, Search, Filter, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { apiRequest, compressImage } from '@/lib/utils'
import { Artwork, Category } from '@/types'
import { ConfirmDialog } from '@/components/ui/dialog'
import { useDrafts } from '@/hooks/useDrafts'

interface ArtworkDraftData {
  title: string
  description: string
  categoryIds: number[]
  type: 'portfolio' | 'scratch'
  imagePreview: string | null
}

export default function ArtworkManager() {
  const [artworks, setArtworks] = useState<Artwork[]>([])
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
    image: null as File | null,
    type: 'portfolio' as 'portfolio' | 'scratch',
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const { drafts, showDraftList, setShowDraftList, saveDraft, restoreDraft, deleteDraft, activeDraftId, setActiveDraftId } = useDrafts<ArtworkDraftData>('artwork_drafts')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; artworkId: number | null }>({
    open: false,
    artworkId: null,
  })

  useEffect(() => {
    Promise.all([fetchCategories()])
  }, [])

  useEffect(() => {
    fetchArtworks()
  }, [currentPage, searchTerm, selectedCategoryIds, selectedType])


  const fetchArtworks = async () => {
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
        data: Artwork[]
        pagination: {
          page: number
          limit: number
          total: number
          totalPages: number
          hasNextPage: boolean
          hasPrevPage: boolean
        }
      }>(`/artworks/my?${params.toString()}`)

      setArtworks(response.data)
      setTotalItems(response.pagination.total)
      setTotalPages(response.pagination.totalPages)
    } catch (error) {
      console.error('Failed to fetch artworks:', error)
      setArtworks([])
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

  const createArtwork = async () => {
    if (!formData.image) return

    setSubmitting(true)
    try {
      const formDataToSend = new FormData()
      const compressedImage = await compressImage(formData.image)
      formDataToSend.append('image', compressedImage)
      formDataToSend.append('title', formData.title)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('categoryIds', JSON.stringify(formData.categoryIds))
      formDataToSend.append('type', formData.type)

      await apiRequest<Artwork>('/artworks', {
        method: 'POST',
        body: formDataToSend,
      })

      resetForm()
      await fetchArtworks() // Refresh the list
    } catch (error) {
      console.error('Failed to create artwork:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const updateArtwork = async (id: number) => {
    setSubmitting(true)
    try {
      const formDataToSend = new FormData()
      if (formData.image) {
        const compressedImage = await compressImage(formData.image)
        formDataToSend.append('image', compressedImage)
      }
      formDataToSend.append('title', formData.title)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('categoryIds', JSON.stringify(formData.categoryIds))
      formDataToSend.append('type', formData.type)

      await apiRequest<Artwork>(`/artworks/${id}`, {
        method: 'PUT',
        body: formDataToSend,
      })

      resetForm()
      await fetchArtworks() // Refresh the list
    } catch (error) {
      console.error('Failed to update artwork:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const showDeleteDialog = (id: number) => {
    setDeleteDialog({ open: true, artworkId: id })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.artworkId) return

    try {
      await apiRequest(`/artworks/${deleteDialog.artworkId}`, { method: 'DELETE' })
      await fetchArtworks() // Refresh the list
    } catch (error) {
      console.error('Failed to delete artwork:', error)
    } finally {
      setDeleteDialog({ open: false, artworkId: null })
    }
  }

  const startEdit = (artwork: Artwork) => {
    setEditingId(artwork.id)
    setFormData({
      title: artwork.title || '',
      description: artwork.description || '',
      categoryIds: artwork.artwork_categories.map(ac => ac.category.id),
      image: null,
      type: artwork.type || 'portfolio',
    })
    // Show current artwork image as preview when editing
    setImagePreview(artwork.image_path)
    setShowCreateForm(true)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      categoryIds: [],
      image: null,
      type: 'portfolio',
    })
    setImagePreview(null)
    setShowCreateForm(false)
    setEditingId(null)
    setActiveDraftId(null)
  }

  const saveNewDraft = () => {
    const draftName = formData.title.trim() || `Draft ${new Date().toLocaleString()}`
    const draftData: ArtworkDraftData = {
      title: formData.title,
      description: formData.description,
      categoryIds: formData.categoryIds,
      type: formData.type,
      imagePreview: imagePreview,
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
        image: null,
        type: draftData.type || 'portfolio',
      })
      setImagePreview(draftData.imagePreview || null)
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setFormData({ ...formData, image: file })

    // Generate preview
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Artworks</h1>
            <p className="text-gray-600 mt-2">Manage your artwork collection</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateForm(true)} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Artwork
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
              {editingId ? 'Edit Artwork' : 'Add New Artwork'}
            </CardTitle>
            <CardDescription>
              {editingId ? 'Update artwork details' : 'Upload a new artwork with details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Image {!editingId && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  {imagePreview ? (
                    <div className="relative w-full max-w-sm">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null)
                          setFormData({ ...formData, image: null })
                          // Reset file input
                          const fileInput = document.getElementById('image') as HTMLInputElement
                          if (fileInput) fileInput.value = ''
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => document.getElementById('image')?.click()}
                        className="absolute bottom-2 right-2 bg-blue-500 text-white rounded-full px-3 py-1 text-sm hover:bg-blue-600 transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => document.getElementById('image')?.click()}
                      className="w-full max-w-sm aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <Plus className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-gray-600 text-center">Click to upload image</p>
                      <p className="text-gray-400 text-sm">PNG, JPG up to 10MB</p>
                    </div>
                  )}
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  Title
                </label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Artwork title"
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
                  placeholder="Artwork description"
                  rows={3}
                />
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
                  onClick={() => editingId ? updateArtwork(editingId) : createArtwork()}
                  disabled={submitting || (!editingId && !formData.image)}
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
        artworks.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                {searchTerm || selectedCategoryIds.length > 0 ? <Search className="w-12 h-12 mx-auto" /> : <ImageIcon className="w-12 h-12 mx-auto" />}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || selectedCategoryIds.length > 0 || selectedType !== 'all' ? 'No artworks found' : 'No artworks yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedCategoryIds.length > 0 || selectedType !== 'all'
                  ? 'No artworks match your current search and filter criteria. Try adjusting your search terms or filters.'
                  : 'Upload your first artwork to get started.'
                }
              </p>
              {!searchTerm && selectedCategoryIds.length === 0 && selectedType === 'all' && (
                <Button onClick={() => setShowCreateForm(true)} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Artwork
                </Button>
              )}
            </CardContent>
          </Card>
        ) :
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
              {artworks.map((artwork) => (
                <Card key={artwork.id} className="overflow-hidden">
                  <div className="aspect-square bg-gray-100 relative">
                    <img
                      src={artwork.image_path}
                      alt={artwork.title || 'Untitled'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-image.svg'
                      }}
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between mb-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-md line-clamp-1">
                            {artwork.title || 'Untitled'}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${artwork.type === 'portfolio'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                            }`}>
                            {artwork.type === 'portfolio' ? 'Portfolio' : 'Scratch'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {artwork.description || ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(artwork.updated_at || artwork.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(artwork)} className="flex-1 sm:flex-none">
                            <Edit3 className="w-4 h-4 sm:mr-0 mr-2" />
                            <span className="sm:hidden">Edit</span>
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => showDeleteDialog(artwork.id)} className="flex-1 sm:flex-none">
                            <Trash2 className="w-4 h-4 sm:mr-0 mr-2" />
                            <span className="sm:hidden">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 min-h-6 mt-8">
                      {artwork.artwork_categories.length > 0 ?
                        artwork.artwork_categories.map((pc) => (
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

      {!showCreateForm && artworks.length > 0 && totalPages <= 1 && (
        <div className="mt-6 text-center text-sm text-gray-500">
          Showing {totalItems} artwork{totalItems !== 1 ? 's' : ''}
        </div>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, artworkId: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Artwork"
        message="Are you sure you want to delete this artwork? This action cannot be undone."
      />
    </div>
  )
}