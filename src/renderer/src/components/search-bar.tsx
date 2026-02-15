import { useState, useEffect } from 'react'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value?: string
  onChange: (query: string) => void
  placeholder?: string
}

export function SearchBar({
  value = '',
  onChange,
  placeholder = 'Search tasks...'
}: SearchBarProps): React.JSX.Element {
  const [localValue, setLocalValue] = useState(value)

  // Sync local value with prop value
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounce the onChange call
  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(localValue)
    }, 300)

    return () => clearTimeout(timeout)
  }, [localValue, onChange])

  const handleClear = (): void => {
    setLocalValue('')
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-9"
      />
      {localValue && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 size-7 p-0"
        >
          <X className="size-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}
    </div>
  )
}
