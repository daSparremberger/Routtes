'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export interface ShellOptions {
  title?: string
  headerActions?: ReactNode
  searchValue?: string
  onSearchChange?: (value: string) => void
}

interface ShellContextValue {
  options: ShellOptions
  setOptions: (options: ShellOptions) => void
  resetOptions: () => void
}

const ShellContext = createContext<ShellContextValue>({
  options: {},
  setOptions: () => {},
  resetOptions: () => {},
})

export function ShellProvider({ children }: { children: ReactNode }) {
  const [options, setOptionsState] = useState<ShellOptions>({})
  const setOptions = useCallback((next: ShellOptions) => setOptionsState(next), [])
  const resetOptions = useCallback(() => setOptionsState({}), [])

  const value = useMemo(
    () => ({
      options,
      setOptions,
      resetOptions,
    }),
    [options, resetOptions, setOptions],
  )

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShellConfig(options: ShellOptions) {
  const { setOptions } = useContext(ShellContext)
  const previous = useRef<ShellOptions | null>(null)

  useEffect(() => {
    const changed =
      !previous.current ||
      previous.current.title !== options.title ||
      previous.current.headerActions !== options.headerActions ||
      previous.current.searchValue !== options.searchValue ||
      previous.current.onSearchChange !== options.onSearchChange

    if (changed) {
      previous.current = options
      setOptions(options)
    }
  }, [options, setOptions])
}

export function useShellContext() {
  return useContext(ShellContext)
}
