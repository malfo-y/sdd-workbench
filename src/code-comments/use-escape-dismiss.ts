import { useEffect } from 'react'

type UseEscapeDismissOptions = {
  isEnabled: boolean
  canDismiss?: boolean
  onDismiss: () => void
}

export function useEscapeDismiss({
  isEnabled,
  canDismiss = true,
  onDismiss,
}: UseEscapeDismissOptions) {
  useEffect(() => {
    if (!isEnabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !canDismiss) {
        return
      }

      event.preventDefault()
      onDismiss()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [canDismiss, isEnabled, onDismiss])
}
