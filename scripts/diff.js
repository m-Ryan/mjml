/**
 * MJML vs AMP 截图对比：完全复用 amp.js 和 mjml.js 的截图逻辑，用 pixelmatch 做像素 diff。
 * Usage (from project root):
 *   node scripts/diff.js
 *   node scripts/diff.js test/template1.mjml
 * Output: test/output/diff/images/<name>/mjml.png, amp.png, diff.png；test/output/diff/match.json
 */
const fs = require('fs')
const path = require('path')
const { PNG } = require('pngjs')
const pixelmatch = require('pixelmatch').default || require('pixelmatch')

const root = path.resolve(__dirname, '..')
const { getScreenshot: getScreenshotMjml } = require('./mjml.js')
const { getScreenshot: getScreenshotAmp } = require('./amp.js')

const OUTPUT_BASE = path.join(root, 'test', 'output', 'diff')
const PIXELMATCH_THRESHOLD = 0.1

async function run() {
  const args = process.argv.slice(2)
  let files
  if (args.length > 0) {
    files = args.map((f) => (path.isAbsolute(f) ? f : path.join(root, f)))
  } else {
    const testDir = path.join(root, 'test')
    files = fs
      .readdirSync(testDir)
      .filter((f) => /^template\d+\.mjml$/.test(f))
      .map((f) => path.join(testDir, f))
  }

  if (!fs.existsSync(OUTPUT_BASE)) {
    fs.mkdirSync(OUTPUT_BASE, { recursive: true })
  }

  const matchResult = {}

  for (const filePath of files) {
    const name = path.basename(filePath, path.extname(filePath))
    if (!fs.existsSync(filePath)) {
      console.warn('Skip (not found):', filePath)
      matchResult[name] = false
      continue
    }

    const mjmlSource = fs.readFileSync(filePath, 'utf8')

    let mjmlBuffer, ampBuffer
    try {
      mjmlBuffer = await getScreenshotMjml(mjmlSource)
    } catch (err) {
      console.warn(name, 'mjml screenshot:', err.message)
      matchResult[name] = false
      continue
    }
    try {
      ampBuffer = await getScreenshotAmp(mjmlSource)
    } catch (err) {
      console.warn(name, 'amp screenshot:', err.message)
      matchResult[name] = false
      continue
    }

    const mjmlPng = PNG.sync.read(mjmlBuffer)
    const ampPng = PNG.sync.read(ampBuffer)
    const dir = path.join(OUTPUT_BASE, 'images', name)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(path.join(dir, 'mjml.png'), mjmlBuffer)
    fs.writeFileSync(path.join(dir, 'amp.png'), ampBuffer)

    let diffPixels = null
    if (mjmlPng.width === ampPng.width && mjmlPng.height === ampPng.height) {
      const diffPng = new PNG({ width: mjmlPng.width, height: mjmlPng.height })
      try {
        diffPixels = pixelmatch(
          mjmlPng.data,
          ampPng.data,
          diffPng.data,
          mjmlPng.width,
          mjmlPng.height,
          { threshold: PIXELMATCH_THRESHOLD }
        )
        fs.writeFileSync(path.join(dir, 'diff.png'), PNG.sync.write(diffPng))
      } catch (err) {
        console.warn(name, 'pixelmatch:', err.message)
      }
    }

    matchResult[name] = diffPixels === null ? null : diffPixels === 0
    const status =
      diffPixels === null
        ? 'SKIP (size mismatch)'
        : diffPixels === 0
          ? 'MATCH'
          : `DIFF (${diffPixels} pixels)`
    console.log(name, status, '->', path.relative(root, dir))
  }

  fs.writeFileSync(
    path.join(OUTPUT_BASE, 'match.json'),
    JSON.stringify(matchResult, null, 2)
  )
  console.log('match.json', matchResult)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
