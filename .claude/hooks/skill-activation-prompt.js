#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')

const PRIORITY_MAP = { high: 0, medium: 1, low: 2 }
const TOP_N = 3

function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.on('data', (chunk) => {
      data += chunk
    })
    process.stdin.on('end', () => resolve(data))
  })
}

function loadRules() {
  const p = path.join(
    process.cwd(),
    '.claude',
    'skills',
    'skill-rules.json',
  )
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return {}
  }
}

function extractPrompt(parsed) {
  if (typeof parsed?.prompt === 'string') return parsed.prompt
  const ti = parsed?.tool_input
  if (ti && typeof ti === 'object') {
    const parts = []
    if (typeof ti.description === 'string') parts.push(ti.description)
    if (typeof ti.prompt === 'string') parts.push(ti.prompt)
    return parts.join(' ')
  }
  return ''
}

function matchSkills(rules, prompt) {
  const lower = prompt.toLowerCase()
  const matches = []
  for (const [name, rule] of Object.entries(rules)) {
    const triggers = rule?.promptTriggers
    if (!triggers) continue
    let hit = false
    if (Array.isArray(triggers.keywords)) {
      for (const kw of triggers.keywords) {
        if (typeof kw === 'string' && kw && lower.includes(kw.toLowerCase())) {
          hit = true
          break
        }
      }
    }
    if (!hit && Array.isArray(triggers.intentPatterns)) {
      for (const pat of triggers.intentPatterns) {
        try {
          if (new RegExp(pat, 'i').test(prompt)) {
            hit = true
            break
          }
        } catch {
          // ignore invalid regex
        }
      }
    }
    if (hit) {
      matches.push({
        name,
        priority: PRIORITY_MAP[rule.priority] ?? 1,
      })
    }
  }
  matches.sort((a, b) => a.priority - b.priority)
  return matches.slice(0, TOP_N)
}

;(async () => {
  const raw = await readStdin()
  let parsed
  try {
    parsed = JSON.parse(raw || '{}')
  } catch {
    process.exit(0)
  }

  const prompt = extractPrompt(parsed)
  if (!prompt) process.exit(0)

  const rules = loadRules()
  const top = matchSkills(rules, prompt)
  if (top.length === 0) process.exit(0)

  console.log(
    '> **Skills available for this task** (use `Skill` tool to load if needed):',
  )
  for (const m of top) console.log(`> - \`${m.name}\``)
  process.exit(0)
})()
