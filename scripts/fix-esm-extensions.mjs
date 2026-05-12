// Post-processes the tsc ESM output (`dist/esm/`) so the package works
// under Node's pure-ESM loader AND publishes proper CJS-flavored types
// for consumers resolving via the `require` condition. Three responsibilities:
//
//   1. Rewrite extensionless relative imports in dist/esm/*.{js,d.ts} so
//      Node ESM (which does no extension resolution for relative specifiers)
//      can load the package.
//   2. Drop dist/esm/package.json with {"type":"module"} so Node treats
//      .js files in that subtree as ESM without forcing module-mode on
//      the entire package (which would break the CJS webpack bundle).
//   3. Mirror dist/esm/**/*.d.ts -> dist/cjs/**/*.d.cts (rewriting
//      relative-import extensions from .js to .cjs). Together with an
//      exports map that points the `require` condition at this tree,
//      this prevents arethetypeswrong's "Masquerading as ESM" diagnostic
//      under node16-from-CJS resolution.
//
// All of this lives in a single post-build step because the rrule build
// pipeline emits a single tsc ESM tree plus a webpack UMD bundle - there
// is no dual tsc emit today.

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(fileURLToPath(import.meta.url), '..', '..')
const ESM_DIR = join(REPO, 'dist', 'esm')
const CJS_TYPES_DIR = join(REPO, 'dist', 'cjs')

// Matches `from '<spec>'`, `import('<spec>')`, and bare `import '<spec>'`
// where <spec> is a relative path (starts with ./ or ../). Quote style is
// captured so we preserve single vs double quotes on rewrite.
const SPEC_RE =
  /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]+?)\2/g

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (entry.isFile()) out.push(full)
  }
  return out
}

// For a relative import in `file`, pick the suffix that turns `spec` into a
// resolvable path. .d.ts and .d.cts files use the runtime extension (.js or
// .cjs) in their import strings; TypeScript resolves those to the adjacent
// declaration file at compile time, so this layer never emits `.d.ts` /
// `.d.cts` literally inside import specifiers.
function pickSuffix(file, baseAbs) {
  const isDts = file.endsWith('.d.ts') || file.endsWith('.d.cts')
  const isCjs = file.endsWith('.cjs') || file.endsWith('.d.cts')
  const runtimeExt = isCjs ? '.cjs' : '.js'
  // Probe the source dist/esm tree for what actually exists. The .d.cts
  // mirror is built from the same module graph as dist/esm/*.d.ts, so file
  // membership is identical - we only need to consult one tree.
  const probeBase = isDts ? baseAbs.replace(CJS_TYPES_DIR, ESM_DIR) : baseAbs
  if (existsSync(probeBase + (isDts ? '.d.ts' : '.js'))) return runtimeExt
  if (existsSync(join(probeBase, isDts ? 'index.d.ts' : 'index.js')))
    return '/index' + runtimeExt
  return null
}

function rewriteContent(src, file) {
  const fileDir = dirname(file)
  let touched = false
  const next = src.replace(SPEC_RE, (match, prefix, quote, spec) => {
    if (/\.(m?js|cjs|json)$/.test(spec)) return match
    const suffix = pickSuffix(file, resolve(fileDir, spec))
    if (!suffix) return match
    touched = true
    return `${prefix}${quote}${spec}${suffix}${quote}`
  })
  return { next, touched }
}

async function rewriteInPlace(file) {
  const src = await readFile(file, 'utf8')
  const { next, touched } = rewriteContent(src, file)
  if (touched) await writeFile(file, next)
  return touched
}

async function mirrorToCjsTypes() {
  const dtsFiles = (await walk(ESM_DIR)).filter((f) => f.endsWith('.d.ts'))
  for (const src of dtsFiles) {
    const rel = relative(ESM_DIR, src).replace(/\.d\.ts$/, '.d.cts')
    const dest = join(CJS_TYPES_DIR, rel)
    await mkdir(dirname(dest), { recursive: true })
    const raw = await readFile(src, 'utf8')
    // Rewrite the .js suffixes (added by the ESM in-place pass) to .cjs so
    // declaration-file resolution stays consistent within the dist/cjs tree.
    const cjsified = raw.replace(SPEC_RE, (match, prefix, quote, spec) => {
      if (/\.cjs$/.test(spec)) return match
      const rewritten = spec.replace(/\.js$/, '.cjs')
      return `${prefix}${quote}${rewritten}${quote}`
    })
    // Strip the .d.ts.map reference - we are not copying source maps for the
    // mirrored tree, and stale references trip up some tooling.
    const stripped = cjsified.replace(/^\/\/# sourceMappingURL=.*$/m, '')
    await writeFile(dest, stripped)
  }
  await writeFile(join(CJS_TYPES_DIR, 'package.json'), '{"type":"commonjs"}\n')
  return dtsFiles.length
}

async function main() {
  if (!existsSync(ESM_DIR)) {
    console.error(`fix-esm-extensions: ${ESM_DIR} does not exist`)
    process.exit(1)
  }
  const files = (await walk(ESM_DIR)).filter(
    (f) => f.endsWith('.js') || f.endsWith('.d.ts')
  )
  let touched = 0
  for (const f of files) if (await rewriteInPlace(f)) touched++

  await writeFile(join(ESM_DIR, 'package.json'), '{"type":"module"}\n')

  const mirrored = await mirrorToCjsTypes()

  console.log(
    `fix-esm-extensions: rewrote ${touched}/${files.length} in dist/esm, mirrored ${mirrored} .d.cts files`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
