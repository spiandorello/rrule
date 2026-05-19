import { useEffect, useState } from 'react'

function readFromHash(): string | null {
  if (typeof window === 'undefined') return null
  const h = window.location.hash
  if (!h.startsWith('#')) return null
  const params = new URLSearchParams(h.slice(1))
  return params.get('r')
}

export function useUrlRRule(initial: string): [string, (v: string) => void] {
  const [value, setValueRaw] = useState<string>(() => {
    const fromHash = readFromHash()
    return fromHash ?? initial
  })

  useEffect(() => {
    const onHash = () => {
      const next = readFromHash()
      if (next != null && next !== value) setValueRaw(next)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setValue = (v: string) => {
    setValueRaw(v)
    const params = new URLSearchParams()
    params.set('r', v)
    const newHash = `#${params.toString()}`
    if (window.location.hash !== newHash) {
      history.replaceState(null, '', newHash)
    }
  }

  return [value, setValue]
}

export function shareUrl(rule: string): string {
  const url = new URL(window.location.href)
  const params = new URLSearchParams()
  params.set('r', rule)
  url.hash = params.toString()
  return url.toString()
}
