import { toast as sonnerToast } from 'sonner'

/**
 * Toast notification helpers wrapping Sonner's toast API.
 * Provides consistent success/error/info/warning messages across the app.
 */

export const toast = {
  /**
   * Show a success toast notification
   * @param message - The success message to display
   * @param description - Optional description or additional details
   */
  success: (message: string, description?: string) => {
    return sonnerToast.success(message, { description })
  },

  /**
   * Show an error toast notification
   * @param message - The error message to display
   * @param description - Optional description or additional details
   */
  error: (message: string, description?: string) => {
    return sonnerToast.error(message, { description })
  },

  /**
   * Show an info toast notification
   * @param message - The info message to display
   * @param description - Optional description or additional details
   */
  info: (message: string, description?: string) => {
    return sonnerToast.info(message, { description })
  },

  /**
   * Show a warning toast notification
   * @param message - The warning message to display
   * @param description - Optional description or additional details
   */
  warning: (message: string, description?: string) => {
    return sonnerToast.warning(message, { description })
  },

  /**
   * Show a loading toast notification
   * @param message - The loading message to display
   * @param description - Optional description or additional details
   */
  loading: (message: string, description?: string) => {
    return sonnerToast.loading(message, { description })
  },

  /**
   * Show a promise toast notification that updates based on promise state
   * @param promise - The promise to track
   * @param messages - Messages for loading, success, and error states
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: Error) => string)
    }
  ) => {
    return sonnerToast.promise(promise, messages)
  },

  /**
   * Dismiss a specific toast by ID or all toasts
   * @param toastId - Optional ID of the toast to dismiss
   */
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId)
  }
}
