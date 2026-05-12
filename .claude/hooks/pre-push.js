#!/usr/bin/env node
'use strict'
const { execSync } = require('child_process')
let input = ''
process.stdin.on('data', (chunk) => {
  input += chunk
})
process.stdin.on('end', () => {
  const data = JSON.parse(input)
  if (!/git\s+push/.test(data?.tool_input?.command ?? '')) process.exit(0)

  const remoteRef = (() => {
    try {
      return execSync('git rev-parse --abbrev-ref --symbolic-full-name @{u}', {
        encoding: 'utf8',
      }).trim()
    } catch {
      return 'HEAD~1'
    }
  })()

  const files = (() => {
    try {
      return execSync(
        `git diff --name-only ${remoteRef} HEAD -- '*.ts' '*.tsx'`,
        { encoding: 'utf8' },
      ).trim()
    } catch {
      return ''
    }
  })()

  if (!files) process.exit(0)

  const fileList = files.split('\n').filter(Boolean)
  if (fileList.length === 0) process.exit(0)

  try {
    execSync(
      `npx jest --findRelatedTests ${fileList.join(' ')} --passWithNoTests`,
      { stdio: 'inherit' },
    )
    process.exit(0)
  } catch {
    console.log('Tests failed.')
    process.exit(2)
  }
})
