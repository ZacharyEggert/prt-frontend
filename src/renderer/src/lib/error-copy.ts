export interface ErrorCopyEntry {
  title: string
  description: string
}

const ERROR_COPY = {
  tasksLoad: {
    title: 'Unable to load tasks',
    description: 'We could not load your task list right now.'
  },
  dashboardLoad: {
    title: 'Unable to load project overview',
    description: 'Project details are unavailable right now.'
  },
  dependencyGraphLoad: {
    title: 'Unable to load dependency graph',
    description: 'Graph data is temporarily unavailable.'
  },
  taskDetailLoad: {
    title: 'Unable to load task details',
    description: 'Task details are temporarily unavailable.'
  },
  dependencyListLoad: {
    title: 'Unable to load dependencies',
    description: 'Dependency details are temporarily unavailable.'
  },
  dependencyCandidatesLoad: {
    title: 'Unable to load available tasks',
    description: 'Please try again to load tasks you can link.'
  },
  taskCreateFailed: {
    title: 'Failed to create task',
    description: 'Please review the form and try again.'
  },
  taskUpdateFailed: {
    title: 'Failed to update task',
    description: 'We could not save your changes. Try again.'
  },
  taskCompleteFailed: {
    title: 'Failed to complete task',
    description: 'We could not mark this task as completed. Try again.'
  },
  taskPassTestFailed: {
    title: 'Failed to mark tests as passing',
    description: 'We could not update test status. Try again.'
  },
  taskDeleteFailed: {
    title: 'Failed to delete task',
    description: 'We could not delete this task. Try again.'
  },
  projectOpenFailed: {
    title: 'Failed to open project',
    description: 'Please confirm the project path and try again.'
  },
  projectCreateFailed: {
    title: 'Failed to create project',
    description: 'Please confirm project details and try again.'
  },
  projectSaveFailed: {
    title: 'Failed to save project',
    description: 'Your changes were not saved. Try again.'
  },
  menuSelectDirectoryFailed: {
    title: 'Failed to select directory',
    description: 'Please try selecting a directory again.'
  },
  menuSaveProjectFailed: {
    title: 'Failed to save project',
    description: 'Please try saving the project again.'
  },
  dependencyRemoveFailed: {
    title: 'Failed to remove dependency',
    description: 'We could not update dependency links. Try again.'
  },
  validationFailedToast: {
    title: 'Validation Failed',
    description: 'Review validation details below to resolve issues.'
  }
} as const satisfies Record<string, ErrorCopyEntry>

export type ErrorCopyKey = keyof typeof ERROR_COPY

export const RETRY_LABEL = 'Try again'

export function getErrorCopy(key: ErrorCopyKey): ErrorCopyEntry {
  return ERROR_COPY[key]
}
