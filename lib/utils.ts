import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import axios, { AxiosRequestConfig, AxiosError } from "axios"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// ImageKit configuration
export const IMAGEKIT_URL_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/your_imagekit_id'

// ImageKit utility function to transform image URLs
export function getImageKitUrl(
  path: string,
  transformations?: {
    width?: number
    height?: number
    quality?: number
    format?: 'jpg' | 'png' | 'webp' | 'auto'
    crop?: 'maintain_ratio' | 'force' | 'at_least' | 'at_max'
    focus?: 'center' | 'top' | 'left' | 'bottom' | 'right' | 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'auto'
  }
): string {
  if (!path) return ''
  
  // If it's already a full URL (external image), return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  
  // Build transformation string
  let transformationString = ''
  if (transformations) {
    const params: string[] = []
    
    if (transformations.width) params.push(`w-${transformations.width}`)
    if (transformations.height) params.push(`h-${transformations.height}`)
    if (transformations.quality) params.push(`q-${transformations.quality}`)
    if (transformations.format) params.push(`f-${transformations.format}`)
    if (transformations.crop) params.push(`c-${transformations.crop}`)
    if (transformations.focus) params.push(`fo-${transformations.focus}`)
    
    if (params.length > 0) {
      transformationString = `tr:${params.join(',')}/`
    }
  }
  
  return `${IMAGEKIT_URL_ENDPOINT}/${transformationString}${cleanPath}`
}

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('cms_active_section')
      throw new Error('Authentication expired')
    }
    throw error
  }
)

export async function apiRequest<T>(
  endpoint: string, 
  options?: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
  }
): Promise<T> {
  try {
    const config: AxiosRequestConfig = {
      method: (options?.method?.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch') || 'get',
      url: endpoint,
      headers: options?.headers,
    }

    // Handle different body types
    if (options?.body) {
      if (options.body instanceof FormData) {
        config.data = options.body
        // Don't set Content-Type for FormData - axios will set it with boundary
      } else if (typeof options.body === 'string') {
        config.data = JSON.parse(options.body)
        config.headers = { ...config.headers, 'Content-Type': 'application/json' }
      } else {
        config.data = options.body
        config.headers = { ...config.headers, 'Content-Type': 'application/json' }
      }
    }

    const response = await api(config)
    return response.data
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication expired') {
      throw error
    }
    
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error || error.response?.data?.message || error.message
      throw new Error(message)
    }
    
    throw new Error('Request failed')
  }
}