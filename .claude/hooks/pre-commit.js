#!/usr/bin/env node
'use strict'
const { execSync } = require('child_process')
let input = ''
process.stdin.on('data', (chunk) => {
  input += chunk
})
process.stdin.on('end', () => {
  const data = JSON.parse(input)
  if (!/git\s+commit/.test(data?.tool_input?.command ?? '')) process.exit(0)
  try {
    execSync('npx lint-staged', { stdio: 'inherit' })
    process.exit(0)
  } catch {
    console.log('lint-staged failed.')
    process.exit(2) // blocks Claude's git commit
  }
})
