import { useAuth, useClerk } from '@clerk/clerk-react'

export function useRequireAuth() {
    const { isSignedIn } = useAuth()
    const { openSignIn } = useClerk()

    const requireAuth = (callback) => {
        if (!isSignedIn) {
            openSignIn()
            return false
        }
        if (callback) callback()
        return true
    }

    return { isSignedIn, requireAuth, openSignIn }
}
