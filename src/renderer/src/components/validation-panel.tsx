import { Alert, AlertTitle, AlertDescription } from './ui/alert'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion'
import { Button } from './ui/button'
import { CheckCircle, AlertCircle } from 'lucide-react'
import type { ProjectValidationResult } from '../../../preload/index'

interface ValidationPanelProps {
  validationResult?: ProjectValidationResult | null
  onTaskClick?: (taskId: string) => void
}

type ErrorCategory = 'task' | 'dependency' | 'structure' | 'other'

interface ParsedError {
  message: string
  category: ErrorCategory
  taskIds: string[]
}

/**
 * Parse validation errors string into individual error lines
 */
function parseValidationErrors(errorString: string): string[] {
  return errorString
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line.startsWith('-'))
    .map((line) => line.substring(1).trim()) // Remove leading "-"
}

/**
 * Extract task IDs from an error message using regex
 */
function extractTaskIds(message: string): string[] {
  const taskIdPattern = /[A-Z]-\d{3}/g
  return message.match(taskIdPattern) || []
}

/**
 * Categorize an error based on keywords in the message
 */
function categorizeError(message: string): ErrorCategory {
  const lowerMessage = message.toLowerCase()

  // Dependency-related errors
  if (
    lowerMessage.includes('circular') ||
    lowerMessage.includes('dependency') ||
    lowerMessage.includes('depends')
  ) {
    return 'dependency'
  }

  // Task-related errors
  if (
    lowerMessage.includes('missing field') ||
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('required')
  ) {
    return 'task'
  }

  // Structure-related errors
  if (
    lowerMessage.includes('metadata') ||
    lowerMessage.includes('structure') ||
    lowerMessage.includes('format')
  ) {
    return 'structure'
  }

  return 'other'
}

/**
 * Group parsed errors by category
 */
function groupErrorsByCategory(errors: ParsedError[]): Record<ErrorCategory, ParsedError[]> {
  return errors.reduce(
    (acc, error) => {
      acc[error.category].push(error)
      return acc
    },
    { task: [], dependency: [], structure: [], other: [] } as Record<ErrorCategory, ParsedError[]>
  )
}

/**
 * Get human-readable label for error category
 */
function getCategoryLabel(category: ErrorCategory): string {
  const labels: Record<ErrorCategory, string> = {
    task: 'Task Errors',
    dependency: 'Dependency Errors',
    structure: 'Structure Errors',
    other: 'Other Issues'
  }
  return labels[category]
}

/**
 * Render error message with clickable task IDs
 */
function renderErrorMessage(
  message: string,
  taskIds: string[],
  onTaskClick?: (taskId: string) => void
): React.ReactNode {
  if (taskIds.length === 0 || !onTaskClick) {
    return <span>{message}</span>
  }

  // Split message and replace task IDs with clickable buttons
  const parts: React.ReactNode[] = []
  let remainingMessage = message
  let keyIndex = 0

  taskIds.forEach((taskId) => {
    const index = remainingMessage.indexOf(taskId)
    if (index !== -1) {
      // Add text before the task ID
      if (index > 0) {
        parts.push(<span key={`text-${keyIndex++}`}>{remainingMessage.substring(0, index)}</span>)
      }

      // Add clickable task ID
      parts.push(
        <Button
          key={`task-${taskId}-${keyIndex++}`}
          variant="link"
          size="sm"
          className="h-auto p-0 text-sm"
          onClick={() => onTaskClick(taskId)}
        >
          {taskId}
        </Button>
      )

      // Update remaining message
      remainingMessage = remainingMessage.substring(index + taskId.length)
    }
  })

  // Add any remaining text
  if (remainingMessage.length > 0) {
    parts.push(<span key={`text-${keyIndex++}`}>{remainingMessage}</span>)
  }

  return <>{parts}</>
}

export function ValidationPanel({
  validationResult,
  onTaskClick
}: ValidationPanelProps): React.JSX.Element | null {
  // Don't render if no validation result
  if (!validationResult) {
    return null
  }

  // Success state
  if (validationResult.success) {
    return (
      <Alert>
        <CheckCircle className="text-green-600" />
        <AlertTitle>Validation Passed</AlertTitle>
        <AlertDescription>Project structure is valid with no errors detected.</AlertDescription>
      </Alert>
    )
  }

  // Error state
  if (!validationResult.errors) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Validation Failed</AlertTitle>
        <AlertDescription>An unknown error occurred during validation.</AlertDescription>
      </Alert>
    )
  }

  // Parse and categorize errors
  const errorLines = parseValidationErrors(validationResult.errors)
  const parsedErrors: ParsedError[] = errorLines.map((message) => ({
    message,
    category: categorizeError(message),
    taskIds: extractTaskIds(message)
  }))

  const groupedErrors = groupErrorsByCategory(parsedErrors)

  // Filter out empty categories
  const categoriesToShow = (Object.keys(groupedErrors) as ErrorCategory[]).filter(
    (category) => groupedErrors[category].length > 0
  )

  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>Validation Failed</AlertTitle>
      <AlertDescription>
        <p className="mb-4">
          Found {parsedErrors.length} validation error{parsedErrors.length !== 1 ? 's' : ''} in your
          project:
        </p>

        <Accordion type="multiple" className="w-full">
          {categoriesToShow.map((category) => {
            const errors = groupedErrors[category]
            return (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger>
                  {getCategoryLabel(category)} ({errors.length})
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 list-disc list-inside">
                    {errors.map((error, index) => (
                      <li key={`${category}-${index}`} className="text-sm">
                        {renderErrorMessage(error.message, error.taskIds, onTaskClick)}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </AlertDescription>
    </Alert>
  )
}
