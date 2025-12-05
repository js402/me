import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface UseAuthGuardOptions {
    redirectTo?: string
    requireCV?: boolean
    cvContent?: string
}

export function useAuthGuard({ redirectTo = 'analysis', requireCV = false, cvContent }: UseAuthGuardOptions = {}) {
    const router = useRouter()

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                router.push(`/auth?redirect=${redirectTo}`)
                return
            }

            if (requireCV && !cvContent) {
                router.push('/')
            }
        }

        checkAuth()
    }, [router, redirectTo, requireCV, cvContent])
}
