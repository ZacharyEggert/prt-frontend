/**
 * Navigation context and hook for page routing.
 *
 * Provides a React Context-based navigation system that:
 * - Manages current view state (welcome/dashboard/tasks)
 * - Automatically redirects to welcome when no project is open
 * - Guards navigation to project-dependent pages
 * - Eliminates prop drilling through Layout component
 *
 * @example
 * ```tsx
 * // In App.tsx
 * function App() {
 *   return (
 *     <NavigationProvider>
 *       <AppContent />
 *     </NavigationProvider>
 *   )
 * }
 *
 * // In any component
 * function MyComponent() {
 *   const { currentView, navigate } = useNavigation()
 *
 *   return (
 *     <button onClick={() => navigate('dashboard')}>
 *       Go to Dashboard
 *     </button>
 *   )
 * }
 * ```
 */

/* eslint-disable react-refresh/only-export-components */
// Disabled: This file exports both NavigationProvider (component) and useNavigation (hook),
// which is a common and intentional pattern for React Context providers.

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useProjectStats } from './use-project'

// ============================================================================
// Types
// ============================================================================

/**
 * Available view types for navigation.
 * - welcome: Initial page, shown when no project is open
 * - dashboard: Project overview with stats and quick actions
 * - tasks: Task list and management interface
 */
export type ViewType = 'welcome' | 'dashboard' | 'tasks'

/**
 * Navigation context value exposed by useNavigation hook.
 */
interface NavigationContextValue {
  /** Current active view */
  currentView: ViewType
  /** Navigate to a different view */
  navigate: (view: ViewType) => void
}

// ============================================================================
// Context
// ============================================================================

const NavigationContext = createContext<NavigationContextValue | null>(null)

// ============================================================================
// Provider Component
// ============================================================================

interface NavigationProviderProps {
  children: ReactNode
}

/**
 * Navigation provider component.
 *
 * Wraps the application to provide navigation state and functions.
 * Must be placed above any components that use the useNavigation hook.
 *
 * **Automatic behaviors:**
 * - Starts at 'welcome' view by default
 * - Auto-redirects to 'welcome' when project is closed
 * - Blocks navigation to dashboard/tasks when no project is open
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <NavigationProvider>
 *       <YourApp />
 *     </NavigationProvider>
 *   )
 * }
 * ```
 */
export function NavigationProvider({ children }: NavigationProviderProps): React.JSX.Element {
  const [currentView, setCurrentView] = useState<ViewType>('welcome')
  const { data: stats, isLoading, isFetching } = useProjectStats()

  // Auto-redirect to welcome when project is closed
  useEffect(() => {
    // Only redirect if:
    // 1. Stats query is not loading or fetching (we have a definitive answer)
    // 2. No stats available (no project open)
    // 3. Currently not on welcome page (avoid unnecessary state update)
    if (!isLoading && !isFetching && !stats && currentView !== 'welcome') {
      // This is a valid use case for setState in effect: synchronizing navigation state
      // with external project state. When a project closes, we must redirect to welcome.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentView('welcome')
    }
  }, [stats, isLoading, isFetching, currentView])

  /**
   * Navigate to a different view.
   *
   * No guard logic - navigation is always allowed. The useEffect below handles
   * auto-redirecting to welcome if a user navigates to dashboard/tasks without a project.
   */
  const navigate = useCallback((view: ViewType) => {
    setCurrentView(view)
  }, [])

  const value: NavigationContextValue = {
    currentView,
    navigate
  }

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access navigation state and functions.
 *
 * Must be used within a NavigationProvider. Throws an error if used outside.
 *
 * @returns Navigation context value with currentView and navigate function
 *
 * @throws {Error} If used outside NavigationProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentView, navigate } = useNavigation()
 *
 *   return (
 *     <div>
 *       <p>Current view: {currentView}</p>
 *       <button onClick={() => navigate('dashboard')}>
 *         Go to Dashboard
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext)

  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }

  return context
}
