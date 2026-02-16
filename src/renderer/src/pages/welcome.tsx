import { useEffect, useState } from 'react'
import { Button } from '@renderer/components/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@renderer/components/ui/card'
import {
  useOpenProjectDialog,
  useInitProject,
  useSelectDirectory
} from '@renderer/hooks/use-project'
import { useNavigation } from '@renderer/hooks/use-navigation'
import { toast } from '@renderer/lib/toast'
import {
  MENU_NEW_PROJECT_DIRECTORY_EVENT,
  type MenuNewProjectDirectoryEventDetail
} from '@renderer/lib/menu-events'

export function WelcomeView(): React.JSX.Element {
  const { navigate } = useNavigation()
  const openDialog = useOpenProjectDialog()
  const selectDir = useSelectDirectory()
  const initProject = useInitProject()

  // State for new project form
  const [showNewProjectForm, setShowNewProjectForm] = useState(false)
  const [projectPath, setProjectPath] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [withSampleTasks, setWithSampleTasks] = useState(false)

  useEffect(() => {
    const handleMenuDirectoryEvent = (event: Event): void => {
      const customEvent = event as CustomEvent<MenuNewProjectDirectoryEventDetail>
      const path = customEvent.detail?.path
      if (!path) return

      setProjectPath(path)
      setProjectName('')
      setProjectDescription('')
      setWithSampleTasks(false)
      setShowNewProjectForm(true)
    }

    window.addEventListener(MENU_NEW_PROJECT_DIRECTORY_EVENT, handleMenuDirectoryEvent)
    return () => {
      window.removeEventListener(MENU_NEW_PROJECT_DIRECTORY_EVENT, handleMenuDirectoryEvent)
    }
  }, [])

  const handleOpenProject = (): void => {
    openDialog.mutate(undefined, {
      onSuccess: (result) => {
        if (!result.canceled && result.roadmap) {
          // Mutation already invalidates queries and caches metadata
          // Navigate immediately - stats will load automatically
          navigate('dashboard')
        }
      }
    })
  }

  const handleSelectDirectory = (): void => {
    selectDir.mutate(undefined, {
      onSuccess: (result) => {
        if (!result.canceled && result.path) {
          setProjectPath(result.path)
          setShowNewProjectForm(true)
        }
      }
    })
  }

  const handleCreateProject = (e: React.FormEvent): void => {
    e.preventDefault()

    if (!projectName.trim() || !projectDescription.trim()) {
      toast.error('Missing fields', 'Please provide both name and description')
      return
    }

    initProject.mutate(
      {
        path: projectPath,
        name: projectName.trim(),
        description: projectDescription.trim(),
        withSampleTasks
      },
      {
        onSuccess: () => {
          navigate('dashboard')
        }
      }
    )
  }

  const handleCancelCreate = (): void => {
    setShowNewProjectForm(false)
    setProjectPath('')
    setProjectName('')
    setProjectDescription('')
    setWithSampleTasks(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold">Welcome to PRT</h1>
        <p className="text-muted-foreground">
          Open an existing project or create a new one to get started with project roadmap tracking.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Open Existing Project Card */}
        <Card>
          <CardHeader>
            <CardTitle>Open Project</CardTitle>
            <CardDescription>Browse for an existing PRT project directory</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleOpenProject}
              disabled={openDialog.isPending}
              variant="outline"
              className="w-full"
            >
              {openDialog.isPending ? 'Opening...' : 'Browse for Project'}
            </Button>
          </CardContent>
        </Card>

        {/* Create New Project Card */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>Initialize a new PRT project in a directory</CardDescription>
          </CardHeader>
          <CardContent>
            {!showNewProjectForm ? (
              <Button
                onClick={handleSelectDirectory}
                disabled={selectDir.isPending}
                className="w-full"
              >
                {selectDir.isPending ? 'Selecting...' : 'Choose Directory'}
              </Button>
            ) : (
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="text-xs text-muted-foreground truncate" title={projectPath}>
                  Location: {projectPath}
                </div>

                <div className="space-y-2">
                  <label htmlFor="project-name" className="text-sm font-medium">
                    Project Name
                  </label>
                  <input
                    id="project-name"
                    type="text"
                    value={projectName}
                    onChange={(e): void => setProjectName(e.target.value)}
                    placeholder="My Project"
                    required
                    className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="project-description" className="text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    id="project-description"
                    value={projectDescription}
                    onChange={(e): void => setProjectDescription(e.target.value)}
                    placeholder="Project description"
                    required
                    rows={3}
                    className="w-full px-3 py-2 rounded-md border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="sample-tasks"
                    type="checkbox"
                    checked={withSampleTasks}
                    onChange={(e): void => setWithSampleTasks(e.target.checked)}
                    className="size-4 rounded border"
                  />
                  <label htmlFor="sample-tasks" className="text-sm">
                    Include sample tasks
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={initProject.isPending} className="flex-1">
                    {initProject.isPending ? 'Creating...' : 'Create Project'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCancelCreate}
                    variant="outline"
                    disabled={initProject.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
