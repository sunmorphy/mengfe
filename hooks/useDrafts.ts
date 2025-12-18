'use client'

import { useState, useEffect } from 'react'

export interface Draft<T> {
    id: string
    name: string
    timestamp: string
    data: T
}

interface UseDraftsReturn<T> {
    drafts: Draft<T>[]
    showDraftList: boolean
    activeDraftId: string | null
    setShowDraftList: (show: boolean) => void
    saveDraft: (name: string, data: T, draftId?: string) => void
    restoreDraft: (draftId: string) => T | null
    deleteDraft: (draftId: string) => void
    setActiveDraftId: (id: string | null) => void
}

/**
 * Custom hook for managing drafts in localStorage
 * @param storageKey - The key to use for localStorage
 * @returns Draft management functions and state
 */
export function useDrafts<T>(storageKey: string): UseDraftsReturn<T> {
    const [drafts, setDrafts] = useState<Draft<T>[]>([])
    const [showDraftList, setShowDraftList] = useState(false)
    const [activeDraftId, setActiveDraftId] = useState<string | null>(null)

    // Load drafts from localStorage on mount
    useEffect(() => {
        loadDrafts()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const loadDrafts = () => {
        try {
            const savedDrafts = localStorage.getItem(storageKey)
            if (savedDrafts) {
                setDrafts(JSON.parse(savedDrafts))
            }
        } catch (error) {
            console.error('Failed to load drafts:', error)
            setDrafts([])
        }
    }

    const saveDraft = (name: string, data: T, draftId?: string) => {
        try {
            const draftName = name.trim() || `Draft ${new Date().toLocaleString()}`
            const existingDrafts = JSON.parse(localStorage.getItem(storageKey) || '[]')

            // If draftId is provided, update existing draft
            if (draftId) {
                const draftIndex = existingDrafts.findIndex((d: Draft<T>) => d.id === draftId)
                if (draftIndex !== -1) {
                    // Update existing draft
                    existingDrafts[draftIndex] = {
                        ...existingDrafts[draftIndex],
                        name: draftName,
                        timestamp: new Date().toISOString(),
                        data,
                    }
                    localStorage.setItem(storageKey, JSON.stringify(existingDrafts))
                    setDrafts(existingDrafts)
                    return
                }
            }

            // Create new draft
            const newDraft: Draft<T> = {
                id: Date.now().toString(),
                name: draftName,
                timestamp: new Date().toISOString(),
                data,
            }

            const updatedDrafts = [...existingDrafts, newDraft]
            localStorage.setItem(storageKey, JSON.stringify(updatedDrafts))
            setDrafts(updatedDrafts)
            setActiveDraftId(newDraft.id)
        } catch (error) {
            console.error('Failed to save draft:', error)
        }
    }

    const restoreDraft = (draftId: string): T | null => {
        try {
            const draft = drafts.find(d => d.id === draftId)
            if (draft) {
                setActiveDraftId(draftId)
                return draft.data
            }
            return null
        } catch (error) {
            console.error('Failed to restore draft:', error)
            return null
        }
    }

    const deleteDraft = (draftId: string) => {
        try {
            const updatedDrafts = drafts.filter(d => d.id !== draftId)
            localStorage.setItem(storageKey, JSON.stringify(updatedDrafts))
            setDrafts(updatedDrafts)
            if (activeDraftId === draftId) {
                setActiveDraftId(null)
            }
        } catch (error) {
            console.error('Failed to delete draft:', error)
        }
    }

    return {
        drafts,
        showDraftList,
        activeDraftId,
        setShowDraftList,
        saveDraft,
        restoreDraft,
        deleteDraft,
        setActiveDraftId,
    }
}
