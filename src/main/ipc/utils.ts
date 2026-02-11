import { ErrorHandlerService } from 'project-roadmap-tracking/dist/services/error-handler.service.js'

export function wrapHandler<T extends (...args: unknown[]) => Promise<unknown>>(handler: T): T {
  const errorHandlerService = new ErrorHandlerService()

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return (await handler(...args)) as ReturnType<T>
    } catch (error) {
      const formattedError = errorHandlerService.formatErrorMessage(error)
      throw new Error(formattedError)
    }
  }) as T
}
