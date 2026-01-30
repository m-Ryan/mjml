/**
 * 验证 MJML vs AMP 的 diff 是否与 font-family 有关。
 * 用法（项目根目录）: node scripts/check-font-diff.js [test/template1.mjml]
 * 输出：标准 HTML 的字体加载方式 vs AMP 的字体加载方式；并可选地生成“无 mj-font”版本做对比。
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const mjml2html = require('mjml')
const skeletonModule = require(path.join(root, 'packages/mjml-core/lib/helpers/skeleton'))
const skeleton = skeletonModule.default || skeletonModule
const ampPreset = require(path.join(root, 'packages/mjml/test/amp-preset.js'))

async function main() {
  const file = process.argv[2] || path.join(root, 'test', 'template1.mjml')
  const mjmlSource = fs.readFileSync(path.isAbsolute(file) ? file : path.join(root, file), 'utf8')

  // 1) 标准 HTML
  const standard = await mjml2html(mjmlSource, { skeleton })
  const standardHtml = standard.html
  const hasLinkFont = /<link[^>]+href=["'][^"']*fonts\.googleapis[^"']*["'][^>]*>/i.test(standardHtml)
  const hasImportFont = /@import\s+url\s*\(\s*[^)]*fonts\.googleapis[^)]*\)/i.test(standardHtml)
  const headMatch = standardHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  const headContent = headMatch ? headMatch[1] : ''

  console.log('=== 标准 HTML (MJML) ===')
  console.log('  <link> 引用 Google Fonts:', hasLinkFont ? '是' : '否')
  console.log('  @import 引用 Google Fonts:', hasImportFont ? '是' : '否')
  if (headContent) {
    const fontRelated = headContent
      .split('\n')
      .filter((line) => /link|@import|font|style/.test(line) && !/outlook|mso|X-UA-Compatible/.test(line))
    if (fontRelated.length) {
      console.log('  <head> 中与字体相关的片段:')
      fontRelated.forEach((l) => console.log('   ', l.trim().slice(0, 120)))
    }
  }

  // 2) AMP HTML
  const amp = await mjml2html(mjmlSource, { presets: [ampPreset], fetchImageDimensions: true })
  const ampHtml = amp.html
  const ampHasLink = /<link\s[^>]*>/i.test(ampHtml)
  const ampHeadMatch = ampHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  const ampHeadContent = ampHeadMatch ? ampHeadMatch[1] : ''

  console.log('\n=== AMP HTML ===')
  console.log('  存在 <link> 标签:', ampHasLink ? '是（若为是，说明仍有 link 未被 strip）' : '否（正常：AMP 会 strip 掉）')
  console.log('  amp-custom 中 @font-face: AMP4EMAIL 规范不允许，当前实现不内联')
  if (ampHeadContent) {
    const ampStyle = ampHeadContent.match(/<style\s+amp-custom[^>]*>([\s\S]*?)<\/style>/i)
    if (ampStyle) {
      const hasFontFace = /@font-face\s*\{/i.test(ampStyle[1])
      console.log('  amp-custom 内是否含 @font-face:', hasFontFace ? '是' : '否')
    }
  }

  // 3) 内联 style 中的 font-family 是否一致（取样第一处）
  const standardFontFamily = standardHtml.match(/font-family\s*:\s*([^;"']+)/i)
  const ampFontFamily = ampHtml.match(/font-family\s*:\s*([^;"']+)/i)
  console.log('\n=== 内联 font-family 取样 ===')
  console.log('  标准:', standardFontFamily ? standardFontFamily[1].trim() : '(无)')
  console.log('  AMP:', ampFontFamily ? ampFontFamily[1].trim() : '(无)')

  console.log('\n结论: 若标准版有 <link>/@import 加载字体而 AMP 没有，则 AMP 端会回退到系统字体，')
  console.log('      与标准版渲染的字体不一致，会导致 diff 中文字区域大量红点。')
  console.log('验证建议: 临时去掉模板中的 <mj-font>，仅保留 font-family 为 Arial,sans-serif，')
  console.log('          再跑 diff；若文字区域差异明显减少，可确认与 font 有关。')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
