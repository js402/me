import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CVStore {
    content: string
    filename: string
    analysis: string
    guidance: Record<string, unknown> | null
    setCV: (content: string, filename: string) => void
    setAnalysis: (analysis: string) => void
    setGuidance: (guidance: Record<string, unknown>) => void
    clear: () => void
}

export const useCVStore = create<CVStore>()(
    persist(
        (set) => ({
            content: '',
            filename: '',
            analysis: '',
            guidance: null,
            setCV: (content, filename) => set({ content, filename }),
            setAnalysis: (analysis) => set({ analysis }),
            setGuidance: (guidance) => set({ guidance }),
            clear: () => set({ content: '', filename: '', analysis: '', guidance: null }),
        }),
        {
            name: 'cv-storage',
        }
    )
)
