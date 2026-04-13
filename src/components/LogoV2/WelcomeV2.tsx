import React from 'react'
import { Box, Text } from '../../ink.js'

const WELCOME_V2_WIDTH = 60

const CAT_ART = `
    /\\_____/\\
   /  o   o  \\
  ( ==  ^  == )
   )         (
  (           )
 ( (  )   (  ) )
(__(__)___(__)__)
`

export function WelcomeV2({ compact }: { compact?: boolean }) {
  const version = (globalThis as any).MACRO?.VERSION ?? '1.0.0'

  if (compact) {
    return (
      <Box width={WELCOME_V2_WIDTH}>
        <Text>
          <Text color="#4da6ff">Welcome to AgentiCode </Text>
          <Text dimColor>v{version}</Text>
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" width={WELCOME_V2_WIDTH}>
      <Text color="#4da6ff">Welcome to AgentiCode </Text>
      <Text dimColor>v{version}</Text>
      <Text>{''}</Text>
      {CAT_ART.split('\n').map((line, i) => (
        <Text key={i} color="#7bbfff">{line}</Text>
      ))}
      <Text>{''}</Text>
      <Text color="#4da6ff">{'═'.repeat(WELCOME_V2_WIDTH)}</Text>
    </Box>
  )
}

export { WELCOME_V2_WIDTH }
