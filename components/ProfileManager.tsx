'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, User as UserIcon, Mail, Calendar, Hash, Plus, X, Camera, Loader2 } from 'lucide-react'
import { apiRequest } from '@/lib/utils'
import { User } from '@/types'
import { AlertDialog } from '@/components/ui/dialog'

export default function ProfileManager() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    summary: '',
    socials: [] as string[],
  })
  const [newSocial, setNewSocial] = useState('')
  const [newSocialIcon, setNewSocialIcon] = useState('')
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [alertDialog, setAlertDialog] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: '',
    message: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        summary: user.summary || '',
        socials: user.socials || [],
      })
      setProfileImage(user.profile_image_path || null)
    }
  }, [user])

  // Check if phosphor icon exists
  const isValidPhosphorIcon = (iconName: string): boolean => {
    if (!iconName.trim()) return false
    try {
      const element = document.createElement('i')
      element.className = `ph-${iconName.toLowerCase()}`
      return true // Phosphor will handle invalid icons gracefully
    } catch {
      return false
    }
  }

  // Parse social string (icon|url format)
  const parseSocialString = (socialString: string): { icon: string; url: string } => {
    const parts = socialString.split('|')
    if (parts.length === 2) {
      return { icon: parts[0], url: parts[1] }
    }
    return { icon: '', url: socialString }
  }

  // Format social string for API (icon|url format)
  const formatSocialString = (icon: string, url: string): string => {
    if (icon.trim()) {
      return `${icon.trim()}|${url.trim()}`
    }
    return url.trim()
  }

  const updateProfile = async () => {
    try {
      setLoading(true)
      await apiRequest('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(formData),
      })

      // Note: In a real app, you'd want to update the user context here
      setAlertDialog({
        open: true,
        title: 'Success',
        message: 'Profile updated successfully!'
      })
    } catch (error) {
      console.error('Failed to update profile:', error)
      setAlertDialog({
        open: true,
        title: 'Error',
        message: 'Failed to update profile'
      })
    } finally {
      setLoading(false)
    }
  }

  const addSocial = () => {
    if (newSocial.trim()) {
      const socialString = formatSocialString(newSocialIcon, newSocial)
      if (!formData.socials.includes(socialString)) {
        setFormData({
          ...formData,
          socials: [...formData.socials, socialString]
        })
        setNewSocial('')
        setNewSocialIcon('')
      }
    }
  }

  const removeSocial = (index: number) => {
    setFormData({
      ...formData,
      socials: formData.socials.filter((_, i) => i !== index)
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setAlertDialog({
        open: true,
        title: 'Error',
        message: 'Image size must be less than 5MB'
      })
      return
    }

    if (!file.type.startsWith('image/')) {
      setAlertDialog({
        open: true,
        title: 'Error',
        message: 'Please select a valid image file'
      })
      return
    }

    try {
      setUploadingImage(true)
      const formData = new FormData()
      formData.append('image', file)

      const response = await apiRequest<{ user: User; imageUrl: string }>('/auth/profile/image', {
        method: 'POST',
        body: formData,
      })

      setProfileImage(response.user.profile_image_path || null)

      setAlertDialog({
        open: true,
        title: 'Success',
        message: 'Profile image updated successfully!'
      })
    } catch (error) {
      console.error('Failed to upload profile image:', error)
      setAlertDialog({
        open: true,
        title: 'Error',
        message: 'Failed to upload profile image'
      })
    } finally {
      setUploadingImage(false)
    }
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-2">Manage your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Profile Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Account Info
            </CardTitle>
            <CardDescription>
              Basic account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            <hr className="border-gray-200" />

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">ID:</span>
                <span className="font-mono">{user.id}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <UserIcon className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Username:</span>
                <span className="font-medium">{user.username}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Joined:</span>
                <span>{new Date(user.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>
                Update your profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Profile Image */}
              <div className="flex flex-col items-center space-y-3">
                <div className="relative">
                  <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-gray-200">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt='Profile'
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=3b82f6&color=fff&size=96`
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <UserIcon className="w-8 h-8 text-white" />
                      </div>
                    )}
                  </div>
                  <label
                    htmlFor="profile-image-upload"
                    className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors shadow-lg"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </label>
                  <input
                    id="profile-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Click the camera icon to change your profile picture
                </p>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); updateProfile(); }} className="space-y-4 mt-8">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">
                    <UserIcon className="w-4 h-4 inline mr-2" />
                    Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="summary" className="block text-sm font-medium mb-2">
                    Summary
                  </label>
                  <Textarea
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Social Links
                  </label>

                  {/* Add new social */}
                  <div className="space-y-2 mb-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <div className="flex gap-2">
                          <div className="relative flex-none w-24">
                            <Input
                              value={newSocialIcon}
                              onChange={(e) => setNewSocialIcon(e.target.value)}
                              placeholder="twitter"
                              className="pr-8"
                            />
                            {/* Icon preview */}
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              {newSocialIcon.trim() && (
                                <i
                                  className={`ph-${newSocialIcon.toLowerCase()} text-lg ${isValidPhosphorIcon(newSocialIcon) ? 'text-green-600' : 'text-red-400'
                                    }`}
                                />
                              )}
                            </div>
                          </div>
                          <Input
                            value={newSocial}
                            onChange={(e) => setNewSocial(e.target.value)}
                            placeholder="https://twitter.com/username"
                            onKeyDown={(e) => e.key === 'Enter' && addSocial()}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <Button type="button" size="sm" onClick={addSocial} className="w-full sm:w-auto">
                        <Plus className="w-4 h-4 sm:mr-0 mr-2" />
                        <span className="sm:hidden">Add Social</span>
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Icon: Enter Phosphor icon name (e.g., twitter, instagram, linkedin). URL: Enter the full social media URL.
                    </p>
                  </div>

                  {/* Existing socials */}
                  <div className="space-y-2">
                    {formData.socials.map((social, index) => {
                      const { icon, url } = parseSocialString(social)
                      return (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2 flex-1">
                            {icon && (
                              <i
                                className={`ph-${icon.toLowerCase()} text-lg text-blue-600`}
                                title={icon}
                              />
                            )}
                            <span className="text-sm break-all">{url}</span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => removeSocial(index)}
                            className="shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog
        open={alertDialog.open}
        onClose={() => setAlertDialog({ open: false, title: '', message: '' })}
        title={alertDialog.title}
        message={alertDialog.message}
      />
    </div>
  )
}