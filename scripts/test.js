/**
 * MJML vs AMP 截图 diff：跑全部或单个 template*.mjml，输出截图和最终报告（非测试）。
 * 运行（项目根目录）:
 *   node scripts/test.js              # 跑全部 template*.mjml
 *   node scripts/test.js template11   # 只跑 template11.mjml（可省略 .mjml）
 *   node scripts/test.js 11          # 只跑 template11.mjml
 * 输出: test/output/diff/images/<name>/mjml.png, amp.png, diff.png；test/output/diff/report.json
 */
const fs = require('fs')
const path = require('path')
const { PNG } = require('pngjs')
const pixelmatch = require('pixelmatch').default || require('pixelmatch')

const root = path.resolve(__dirname, '..')
const testDir = path.join(root, 'test')
const scriptsDir = path.join(root, 'scripts')
const OUTPUT_BASE = path.join(root, 'test', 'output', 'diff')

const { getScreenshot: getScreenshotMjml } = require(path.join(scriptsDir, 'mjml.js'))
const { getScreenshot: getScreenshotAmp } = require(path.join(scriptsDir, 'amp.js'))

const SCREENSHOT_OPTIONS = { validationLevel: 'skip' }
const PIXELMATCH_THRESHOLD = 0.1
const MAX_DIFF_PIXELS = 0
const MAX_CONCURRENT = 3

/** 最多 concurrency 个任务同时执行，完成一个再从队列取下一个；返回与 Promise.allSettled 相同结构的数组 */
async function runWithConcurrency(tasks, concurrency) {
  const results = []
  let index = 0
  const runNext = async () => {
    if (index >= tasks.length) return
    const i = index++
    const task = tasks[i]
    try {
      const value = await task()
      results[i] = { status: 'fulfilled', value }
    } catch (reason) {
      results[i] = { status: 'rejected', reason }
    }
    await runNext()
  }
  const workers = Array(Math.min(concurrency, tasks.length))
    .fill(null)
    .map(() => runNext())
  await Promise.all(workers)
  return results
}

function writeDiffArtifacts(name, mjmlBuffer, ampBuffer, diffPng) {
  const dir = path.join(OUTPUT_BASE, 'images', name)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'mjml.png'), mjmlBuffer)
  fs.writeFileSync(path.join(dir, 'amp.png'), ampBuffer)
  if (diffPng) {
    fs.writeFileSync(path.join(dir, 'diff.png'), PNG.sync.write(diffPng))
  }
}

/** 尺寸不一致时：生成 mjml 与 amp 并排对比图作为 diff.png */
function compositeSideBySide(mjmlPng, ampPng) {
  const gap = 16
  const w = mjmlPng.width + gap + ampPng.width
  const h = Math.max(mjmlPng.height, ampPng.height)
  const out = new PNG({ width: w, height: h })
  const bg = 0xf0
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = out.data[i + 1] = out.data[i + 2] = bg
    out.data[i + 3] = 255
  }
  const copyInto = (src, offsetX, offsetY) => {
    for (let y = 0; y < src.height; y++) {
      const srcStart = y * src.width * 4
      const dstStart = ((offsetY + y) * w + offsetX) * 4
      src.data.copy(out.data, dstStart, srcStart, srcStart + src.width * 4)
    }
  }
  copyInto(mjmlPng, 0, 0)
  copyInto(ampPng, mjmlPng.width + gap, 0)
  return out
}

function getTemplateFiles() {
  if (!fs.existsSync(testDir)) return []
  return fs
    .readdirSync(testDir)
    .filter((f) => /^template\d+\.mjml$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ''), 10)
      const nb = parseInt(b.replace(/\D/g, ''), 10)
      return na - nb
    })
    .map((f) => path.join(testDir, f))
}

/** 从命令行参数解析单个测试文件。支持：template11、template11.mjml、11 */
function getSingleFileFromArg() {
  const arg = process.argv[2]
  if (!arg) return null
  const trimmed = String(arg).trim()
  let base = trimmed.replace(/\.mjml$/i, '')
  if (/^\d+$/.test(base)) base = `template${base}`
  else if (!/^template\d+$/i.test(base)) base = `template${base}`
  const fileName = base.endsWith('.mjml') ? base : `${base}.mjml`
  const filePath = path.join(testDir, fileName)
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath)
    process.exit(1)
  }
  return filePath
}

async function runDiffForTemplate(filePath) {
  const name = path.basename(filePath, path.extname(filePath))
  const mjmlSource = fs.readFileSync(filePath, 'utf8')

  const mjmlBuffer = await getScreenshotMjml(mjmlSource, SCREENSHOT_OPTIONS)
  const mjmlPng = PNG.sync.read(mjmlBuffer)
  const viewport = { width: mjmlPng.width, height: mjmlPng.height }

  const ampBuffer = await getScreenshotAmp(mjmlSource, { ...SCREENSHOT_OPTIONS, viewport })
  console.log('ampBuffer done ', filePath)

  const ampPng = PNG.sync.read(ampBuffer)

  if (mjmlPng.width !== ampPng.width || mjmlPng.height !== ampPng.height) {
    const diffPng = compositeSideBySide(mjmlPng, ampPng)
    return {
      name,
      status: 'size_mismatch',
      mjmlSize: { w: mjmlPng.width, h: mjmlPng.height },
      ampSize: { w: ampPng.width, h: ampPng.height },
      mjmlBuffer,
      ampBuffer,
      diffPng,
    }
  }

  const diffPng = new PNG({ width: mjmlPng.width, height: mjmlPng.height })
  let diffPixels = null
  try {
    diffPixels = pixelmatch(
      mjmlPng.data,
      ampPng.data,
      diffPng.data,
      mjmlPng.width,
      mjmlPng.height,
      { threshold: PIXELMATCH_THRESHOLD },
    )
  } catch (err) {
    console.warn(name, 'pixelmatch:', err.message)
  }

  return {
    name,
    status:
      diffPixels === null
        ? 'pixelmatch_error'
        : diffPixels <= MAX_DIFF_PIXELS
          ? 'match'
          : 'pixel_diff',
    diffPixels: diffPixels ?? -1,
    mjmlBuffer,
    ampBuffer,
    diffPng: diffPixels !== null ? diffPng : null,
  }
}

async function run() {
  const singleFile = getSingleFileFromArg()
  const files = singleFile ? [singleFile] : getTemplateFiles()
  if (files.length === 0) {
    console.log('No template*.mjml files in test/')
    return
  }
  if (singleFile) {
    console.log('Single file mode:', path.basename(singleFile))
  }

  const filters = files

  const MAX_RETRIES = 1

  console.log(`Running ${filters.length} templates (max ${MAX_CONCURRENT} concurrent)...`)
  const taskFns = filters.map((filePath) => async () => {
    let lastErr
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const r = await runDiffForTemplate(filePath)
        if (r && r.name != null && r.mjmlBuffer != null && r.ampBuffer != null) {
          writeDiffArtifacts(r.name, r.mjmlBuffer, r.ampBuffer, r.diffPng || null)
        }
        return r
      } catch (err) {
        lastErr = err
        if (attempt < MAX_RETRIES) {
          const name = path.basename(filePath, path.extname(filePath))
          console.warn(name, 'retry after failure:', err.message)
        }
      }
    }
    throw lastErr
  })
  const settled = await runWithConcurrency(taskFns, MAX_CONCURRENT)

  const report = {
    summary: { total: files.length, failed: 0, sizeMismatch: 0, pixelDiff: 0, pixelmatchError: 0, match: 0 },
    failed: [],
    sizeMismatch: [],
    pixelDiff: [],
    pixelmatchError: [],
    match: [],
  }

  const results = []
  settled.forEach((outcome, i) => {
    const name = path.basename(files[i], path.extname(files[i]))
    if (outcome.status === 'fulfilled') {
      results.push(outcome.value)
    } else {
      report.summary.failed += 1
      report.failed.push({ name, error: String(outcome.reason?.message || outcome.reason) })
      console.error(`${name} screenshot failed: ${outcome.reason?.message || outcome.reason}`)
    }
  })

  results.forEach((r) => {
    if (!r) return
    if (r.status === 'size_mismatch') {
      report.summary.sizeMismatch += 1
      report.sizeMismatch.push({
        name: r.name,
        mjmlSize: r.mjmlSize,
        ampSize: r.ampSize,
      })
    } else if (r.status === 'pixel_diff') {
      report.summary.pixelDiff += 1
      report.pixelDiff.push({ name: r.name, diffPixels: r.diffPixels })
    } else if (r.status === 'pixelmatch_error') {
      report.summary.pixelmatchError += 1
      report.pixelmatchError.push(r.name)
    } else {
      report.summary.match += 1
      report.match.push(r.name)
    }
  })

  if (!fs.existsSync(OUTPUT_BASE)) fs.mkdirSync(OUTPUT_BASE, { recursive: true })
  const reportPath = path.join(OUTPUT_BASE, 'report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')

  console.log('')
  console.log('--- Report ---')
  console.log('Total:', report.summary.total)
  console.log('Match:', report.summary.match)
  console.log('Pixel diff:', report.summary.pixelDiff, report.summary.pixelDiff ? report.pixelDiff.map((x) => x.name).join(', ') : '')
  console.log('Size mismatch:', report.summary.sizeMismatch, report.summary.sizeMismatch ? report.sizeMismatch.map((x) => x.name).join(', ') : '')
  console.log('Pixelmatch error:', report.summary.pixelmatchError, report.summary.pixelmatchError ? report.pixelmatchError.join(', ') : '')
  console.log('Screenshot failed:', report.summary.failed, report.summary.failed ? report.failed.map((x) => x.name).join(', ') : '')
  console.log('Report:', reportPath)
  console.log('Screenshots:', path.join(OUTPUT_BASE, 'images'))
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
