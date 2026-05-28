import { cn } from '@/lib/utils'

describe('cn()', () => {
  it('returns a single class unchanged', () => {
    expect(cn('text-slate-900')).toBe('text-slate-900')
  })

  it('merges multiple class names', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('resolves Tailwind conflicts — last value wins', () => {
    // twMerge should keep py-3 and discard py-2
    expect(cn('py-2', 'py-3')).toBe('py-3')
  })

  it('handles conditional classes (falsy values ignored)', () => {
    expect(cn('base', false && 'skipped', 'end')).toBe('base end')
  })

  it('handles undefined and null gracefully', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b')
  })
})
