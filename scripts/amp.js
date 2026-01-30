
const fs = require('fs')
const os = require('os')
const path = require('path')
const puppeteer = require('puppeteer')

const root = path.resolve(__dirname, '..')
const mjmlCore = require(path.join(root, 'packages/mjml-core/lib'))
const mjml2html = mjmlCore.default || mjmlCore
const ampPreset = require(path.join(root, 'packages/mjml/test/amp-preset.js'))

const OUTPUT_DIR = path.join(root, 'test', 'output', 'screenshots-amp')

// 使用系统已安装的 Chrome，避免 puppeteer 下载（macOS / Windows / Linux 常见路径）
function getChromePath() {
  if (process.platform === 'darwin') {
    const p = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    if (fs.existsSync(p)) return p
    const canary = '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
    if (fs.existsSync(canary)) return canary
  }

  return undefined
}

const chromePath = getChromePath()

// 精简 Chrome 参数，加快启动并减少内存（Bannerbear 等推荐）
const MINIMAL_CHROME_ARGS = [
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-dev-shm-usage',
  '--disable-domain-reliability',
  '--disable-extensions',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-popup-blocking',
  '--disable-renderer-backgrounding',
  '--disable-setuid-sandbox',
  '--disable-sync',
  '--no-first-run',
  '--no-sandbox',
  '--password-store=basic',
]

function getLaunchOptions(userDataDir) {
  const launchOptions = { headless: true, args: MINIMAL_CHROME_ARGS }
  if (chromePath) launchOptions.executablePath = chromePath
  if (userDataDir) launchOptions.userDataDir = userDataDir
  return launchOptions
}

async function getScreenshot(mjml, options = {}) {
  const result = await mjml2html(mjml, {
    presets: [ampPreset],
    fetchImageDimensions: true,
    ...options,
  })
  if (options.validationLevel !== 'skip' && result.errors && result.errors.length) {
    throw new Error(result.errors.map((e) => e.formattedMessage).join('; '))
  }
  const html = result.html

  const ownBrowser = !options.browser
  const browser = options.browser || (await puppeteer.launch(getLaunchOptions()))
  const page = await browser.newPage()

  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  )

  await page.setContent(html, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })

  // 先拉高视口，让整页（含底部）在视口内，否则底部图片可能因懒加载不加载
  await page.setViewport({ width: 1200, height: 20000 })

  // 1) 先等 AMP 运行时加载并完成 amp-img 升级（内部 img 被创建）
  try {
    await page.waitForFunction(
      () => typeof window.AMP !== 'undefined',
      { timeout: 15000 }
    )
  } catch {
    // 非 AMP 或超时，继续
  }

  await page.evaluate(async () => {
    const ampImgs = document.querySelectorAll('amp-img')
    const deadline = Date.now() + 12000
    while (Date.now() < deadline) {
      const allHaveImg = Array.from(ampImgs).every(
        (amp) =>
          amp.querySelector('img') ||
          (amp.shadowRoot && amp.shadowRoot.querySelector('img'))
      )
      if (allHaveImg || ampImgs.length === 0) break
      await new Promise((r) => setTimeout(r, 50))
    }
  })

  // 2) 纯事件等待：等每张图片 load 或 error 后再截图（含 amp-img 内 light/shadow 的 img）
  const PER_IMAGE_TIMEOUT_MS = 10000
  const TOTAL_WAIT_MS = 20000
  await page.evaluate((perImgTimeout, totalTimeout) => {
    const collectImgs = () => {
      const set = new Set(document.querySelectorAll('img'))
      document.querySelectorAll('amp-img').forEach((amp) => {
        const inLight = amp.querySelector('img')
        if (inLight) set.add(inLight)
        const inShadow = amp.shadowRoot && amp.shadowRoot.querySelector('img')
        if (inShadow) set.add(inShadow)
      })
      return Array.from(set)
    }
    const waitOne = (img) =>
      new Promise((resolve) => {
        if (img.complete) {
          resolve()
          return
        }
        const done = () => {
          img.onload = null
          img.onerror = null
          resolve()
        }
        img.onload = done
        img.onerror = done
        setTimeout(done, perImgTimeout)
      })
    return (async () => {
      const deadline = Date.now() + totalTimeout
      let prevIds = ''
      while (Date.now() < deadline) {
        const imgs = collectImgs()
        const ids = imgs.map((i) => i.src).sort().join(',')
        if (imgs.length > 0) {
          await Promise.all(imgs.map(waitOne))
          const allDone = imgs.every((i) => i.complete)
          if (allDone && ids === prevIds) break
          prevIds = ids
        }
        await new Promise((r) => setTimeout(r, 50))
      }
    })()
  }, PER_IMAGE_TIMEOUT_MS, TOTAL_WAIT_MS)

  // 3) 再等每个 amp-img 自身触发 load/error（部分环境 img 在 shadow 内难以拿到）
  await page.evaluate((timeoutMs) => {
    const amps = Array.from(document.querySelectorAll('amp-img'))
    if (amps.length === 0) return Promise.resolve()
    return Promise.race([
      new Promise((resolve) => {
        let done = 0
        const onDone = () => {
          done++
          if (done >= amps.length) resolve()
        }
        amps.forEach((el) => {
          el.addEventListener('load', onDone, { once: true })
          el.addEventListener('error', onDone, { once: true })
        })
      }),
      new Promise((r) => setTimeout(r, timeoutMs)),
    ])
  }, 10000)

  await new Promise((r) => setTimeout(r, 200)) // 布局稳定后再量尺寸、截图

  let dimensions
  if (options.viewport && typeof options.viewport.width === 'number' && typeof options.viewport.height === 'number') {
    dimensions = { width: options.viewport.width, height: options.viewport.height }
  } else {
    await page.setViewport({ width: 1200, height: 800 })
    dimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }))
  }
  await page.setViewport(dimensions)

  const buffer = await page.screenshot({ type: 'png', encoding: 'binary' })
  await page.close()
  if (ownBrowser) await browser.close()
  return buffer
}

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

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const filters = files.filter((_, index) => index <= 2)
  const userDataDir = path.join(os.tmpdir(), 'mjml-amp-screenshots-cache')
  const browser = await puppeteer.launch(getLaunchOptions(userDataDir))

  try {
    for (const filePath of filters) {
      const name = path.basename(filePath, path.extname(filePath))
      if (!fs.existsSync(filePath)) {
        console.warn('Skip (not found):', filePath)
        continue
      }
      const mjmlSource = fs.readFileSync(filePath, 'utf8')
      try {
        const png = await getScreenshot(mjmlSource, { browser })
        const outPath = path.join(OUTPUT_DIR, `${name}.png`)
        fs.writeFileSync(outPath, png)
        console.log('OK', name, '->', path.relative(root, outPath))
      } catch (err) {
        console.warn(name, 'screenshot failed:', err.message)
      }
    }
  } finally {
    await browser.close()
  }
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = { getScreenshot }
