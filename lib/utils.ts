import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import axios, { AxiosRequestConfig, AxiosError } from "axios"
import Compressor from "compressorjs";

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

export const compressImage = (image: File): Promise<File | Blob> => {
  return new Promise((resolve, reject) => {
    new Compressor(image, {
      quality: 0.5,
      success(result) {
        resolve(result);
      },
      error(err) {
        console.log(err.message);
        resolve(image);
      },
    });
  });
};

export const compressVideo = (video: File): Promise<File | Blob> => {
  return new Promise(async (resolve, reject) => {
    try {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';

      videoElement.onloadedmetadata = async () => {
        try {
          // Create a canvas to capture video frames
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(video);
            return;
          }

          // Set canvas dimensions (reduce resolution for compression)
          const maxWidth = 1920;
          const maxHeight = 1080;
          let width = videoElement.videoWidth;
          let height = videoElement.videoHeight;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;

          // Calculate adaptive bitrate based on original file size and duration
          // Target: compress to ~70% of original size or use minimum quality
          const duration = videoElement.duration;
          const originalBitrate = (video.size * 8) / duration; // bits per second
          const targetBitrate = Math.min(
            Math.max(originalBitrate * 0.7, 500000), // At least 500kbps
            2500000 // Max 2.5 Mbps
          );

          // Use MediaRecorder to compress
          const stream = canvas.captureStream(30); // 30 FPS
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: targetBitrate
          });

          const chunks: Blob[] = [];
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          mediaRecorder.onstop = () => {
            const compressedBlob = new Blob(chunks, { type: 'video/webm' });

            // Only use compressed version if it's actually smaller
            if (compressedBlob.size < video.size) {
              const compressedFile = new File([compressedBlob], video.name.replace(/\.[^/.]+$/, '.webm'), {
                type: 'video/webm',
                lastModified: Date.now(),
              });
              console.log(`Video compressed: ${(video.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
              resolve(compressedFile);
            } else {
              console.log(`Compression skipped: original (${(video.size / 1024 / 1024).toFixed(2)}MB) is smaller than compressed (${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB)`);
              resolve(video);
            }
            URL.revokeObjectURL(videoElement.src);
          };

          mediaRecorder.onerror = () => {
            resolve(video);
            URL.revokeObjectURL(videoElement.src);
          };

          // Play video and draw frames to canvas
          videoElement.play();
          mediaRecorder.start();

          const drawFrame = () => {
            if (!videoElement.paused && !videoElement.ended) {
              ctx.drawImage(videoElement, 0, 0, width, height);
              requestAnimationFrame(drawFrame);
            } else {
              mediaRecorder.stop();
            }
          };

          drawFrame();
        } catch (error) {
          console.error('Video compression error:', error);
          resolve(video);
        }
      };

      videoElement.onerror = () => {
        console.error('Error loading video');
        resolve(video);
      };

      videoElement.src = URL.createObjectURL(video);
    } catch (error) {
      console.error('Video compression failed:', error);
      resolve(video);
    }
  });
};