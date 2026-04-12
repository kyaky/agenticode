import { useEffect, useState } from 'react'
import {
  type AgenticodeAILimits,
  currentLimits,
  statusListeners,
} from './aiLimits.js'

export function useAgenticodeAiLimits(): AgenticodeAILimits {
  const [limits, setLimits] = useState<AgenticodeAILimits>({ ...currentLimits })

  useEffect(() => {
    const listener = (newLimits: AgenticodeAILimits) => {
      setLimits({ ...newLimits })
    }
    statusListeners.add(listener)

    return () => {
      statusListeners.delete(listener)
    }
  }, [])

  return limits
}
