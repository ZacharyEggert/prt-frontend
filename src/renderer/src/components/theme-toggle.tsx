import { Laptop, Moon, Sun } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@renderer/components/ui/toggle-group'
import { type Theme, useTheme } from '@renderer/hooks/use-theme'

const THEME_OPTIONS: Array<{
  value: Theme
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop }
]

function toTitleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function ThemeToggle(): React.JSX.Element {
  const { theme, resolvedTheme, setTheme } = useTheme()

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-sidebar-foreground/70">Theme</p>

      <ToggleGroup
        type="single"
        value={theme}
        variant="outline"
        size="sm"
        className="w-full"
        aria-label="Theme mode"
        onValueChange={(value): void => {
          if (value === 'light' || value === 'dark' || value === 'system') {
            setTheme(value)
          }
        }}
      >
        {THEME_OPTIONS.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className="flex-1 justify-center gap-1.5"
            aria-label={`${option.label} theme`}
          >
            <option.icon className="size-3.5" />
            <span>{option.label}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <p className="text-[11px] text-center text-sidebar-foreground/60">
        {theme === 'system' ? `System (${toTitleCase(resolvedTheme)})` : toTitleCase(theme)}
      </p>
    </div>
  )
}
