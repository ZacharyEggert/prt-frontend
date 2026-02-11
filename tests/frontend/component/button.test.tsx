import { suite, it, expect } from 'vitest'
import { Button } from '@renderer/components/ui/button'

suite('Button component', () => {
  it('should render the button component', () => {
    expect(Button).toBeTruthy()
  })
})
