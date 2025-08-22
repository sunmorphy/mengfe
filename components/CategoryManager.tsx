'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Edit3, Save, X, Search } from 'lucide-react'
import { apiRequest } from '@/lib/utils'
import { Category } from '@/types'
import { ConfirmDialog } from '@/components/ui/dialog'

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; categoryId: number | null }>({
    open: false,
    categoryId: null,
  })

  useEffect(() => {
    fetchCategories()
  }, [])

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

  const createCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      setIsCreating(true)
      const newCategory = await apiRequest<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })
      setCategories([newCategory, ...categories])
      setNewCategoryName('')
    } catch (error) {
      console.error('Failed to create category:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const updateCategory = async (id: number, name: string) => {
    if (!name.trim()) return

    try {
      const updatedCategory = await apiRequest<Category>(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim() }),
      })
      setCategories(categories.map(cat =>
        cat.id === id ? updatedCategory : cat
      ))
      setEditingId(null)
      setEditingName('')
    } catch (error) {
      console.error('Failed to update category:', error)
    }
  }

  const showDeleteDialog = (id: number) => {
    setDeleteDialog({ open: true, categoryId: id })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.categoryId) return

    try {
      await apiRequest(`/categories/${deleteDialog.categoryId}`, { method: 'DELETE' })
      setCategories(categories.filter(cat => cat.id !== deleteDialog.categoryId))
    } catch (error) {
      console.error('Failed to delete category:', error)
    } finally {
      setDeleteDialog({ open: false, categoryId: null })
    }
  }

  const startEdit = (category: Category) => {
    setEditingId(category.id)
    setEditingName(category.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-2">Manage content categories</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add New Category</CardTitle>
          <CardDescription>Create a new category for organizing your content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createCategory()}
              className="flex-1"
            />
            <Button
              onClick={createCategory}
              disabled={!newCategoryName.trim() || isCreating}
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isCreating ? 'Creating...' : 'Add'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredCategories.map((category) => (
          <Card key={category.id} className="h-fit">
            <CardContent className="p-4">
              {editingId === category.id ? (
                <div className="space-y-3">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        updateCategory(category.id, editingName)
                      }
                      if (e.key === 'Escape') {
                        cancelEdit()
                      }
                    }}
                    autoFocus
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateCategory(category.id, editingName)}
                      disabled={!editingName.trim()}
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEdit}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h3 className="font-medium text-lg line-clamp-2">{category.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(category.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(category)}
                      className="flex-1"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => showDeleteDialog(category.id)}
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <Card className="col-span-full">
          <CardContent className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              {searchTerm ? <Search className="w-12 h-12 mx-auto" /> : <Plus className="w-12 h-12 mx-auto" />}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No categories found' : 'No categories yet'}
            </h3>
            <p className="text-gray-600">
              {searchTerm
                ? `No categories match "${searchTerm}". Try a different search term.`
                : 'Create your first category to get started organizing your content.'
              }
            </p>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, categoryId: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message="Are you sure you want to delete this category? This action cannot be undone."
      />
    </div>
  )
}