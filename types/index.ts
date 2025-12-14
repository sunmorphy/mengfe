export interface User {
  id: number
  username: string
  name?: string
  pseudonym?: string
  email: string
  role?: string
  short_summary?: string
  summary?: string
  socials?: string[]
  profile_image_path?: string
  banner_image_path?: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export interface Artwork {
  id: number
  image_path: string
  title?: string
  description?: string
  type: 'portfolio' | 'scratch'
  created_at: string
  updated_at: string
  artwork_categories: { category: Category }[]
}

export interface Project {
  id: number
  batch_image_path: string[]
  title: string
  description?: string
  type: 'portfolio' | 'scratch'
  created_at: string
  updated_at: string
  project_categories: { category: Category }[]
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthResponse {
  message: string
  user: User
  token: string
}