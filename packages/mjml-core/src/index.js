import {
  find,
  filter,
  get,
  identity,
  map,
  omit,
  reduce,
  isObject,
  each,
  isEmpty,
} from 'lodash'
import juice from 'juice'
import { load } from 'cheerio'
import prettier from 'prettier'
import minifier from 'htmlnano'

import MJMLParser from 'mjml-parser-xml'
import MJMLValidator, {
  dependencies as globalDependencies,
  assignDependencies,
} from 'mjml-validator'

import { initComponent } from './createComponent'
import globalComponents, {
  registerComponent,
  assignComponents,
} from './components'

import makeLowerBreakpoint from './helpers/makeLowerBreakpoint'
import suffixCssClasses from './helpers/suffixCssClasses'
import defaultSkeleton from './helpers/skeletonAmp'
import { buildAmpCustomCssContent } from './helpers/styles'
import { buildMediaQueriesAmpCss } from './helpers/mediaQueries'
import { getFontUrlsForAmp, buildFontsTagsAmp, isAllowlistedFontUrl } from './helpers/fonts'
import { initializeType } from './types/type'

import handleMjmlConfig, {
  readMjmlConfig,
  handleMjmlConfigComponents,
} from './helpers/mjmlconfig'

const isNode = require('detect-node')

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sanitizeInlineStyleAttributes(html, syntaxes) {
  return html.replace(/style="([^"]*)"/g, (match, styleValue) => {
    let sanitizedValue = styleValue
    syntaxes.forEach(({ prefix, suffix }, idx) => {
      const regex = new RegExp(
        `(\\s*)${escapeRegex(prefix)}\\s*([\\s\\S]*?)\\s*${escapeRegex(suffix)}(\\s*)`,
        'g',
      )
      sanitizedValue = sanitizedValue.replace(
        regex,
        (m, leading, variable, trailing) => `${leading}sanitized${idx}:${variable};${trailing}`,
      )
    })
    sanitizedValue = sanitizedValue.replace(/;$/, '')
    return `style="${sanitizedValue}"`
  })
}

function restoreInlineStyleAttributes(html, syntaxes) {
  return html.replace(/style="([^"]*)"/g, (match, styleValue) => {
    let restoredValue = styleValue
    syntaxes.forEach(({ prefix, suffix }, idx) => {
      const regex = new RegExp(`sanitized${idx}:([\\s\\S]*?)(;|$)`, 'g')
      restoredValue = restoredValue.replace(regex, `${prefix}$1${suffix}`)
    })
    restoredValue = restoredValue.replace(/;$/, '')
    return `style="${restoredValue}"`
  })
}

function sanitizeStyleTagBlocks(html, syntaxes) {
  return html.replace(/<style(?:\b[^>]*)?>([\s\S]*?)<\/style\s*>/g, (block, content) => {
    let sanitizedContent = content
    syntaxes.forEach(({ prefix, suffix }, idx) => {
      const regex = new RegExp(
        `\\s*${escapeRegex(prefix)}([\\s\\S]*?)${escapeRegex(suffix)}\\s*`,
        'g',
      )
      sanitizedContent = sanitizedContent.replace(regex, `sanitized${idx}:$1;`)
    })
    return block.replace(content, sanitizedContent)
  })
}

function restoreStyleTagBlocks(html, syntaxes) {
  return html.replace(/sanitized(\d):([\s\S]*?);/g, (match, idx, variable) => {
    const { prefix, suffix } = syntaxes[Number(idx)] || {}
    if (!prefix || !suffix) return match
    return `${prefix}${variable}${suffix}`
  })
}

function sanitizeCssValueVariablesHtml(html, syntaxes) {
  let counter = 0
  const variableMap = {}

  // style="..."
  let result = html.replace(/style="([^"]*)"/g, (match, styleValue) => {
    let sanitizedValue = styleValue
    const matches = []

    syntaxes.forEach(({ prefix, suffix }) => {
      const regex = new RegExp(
        `:\\s*${escapeRegex(prefix)}\\s*([\\s\\S]*?)\\s*${escapeRegex(suffix)}`,
        'g',
      )
      let m = regex.exec(styleValue)
      while (m) {
        // capture the full token only (prefix...suffix)
        const fullToken = m[0].replace(/^\s*:\s*/, '')
        matches.push({ index: m.index, full: fullToken })
        m = regex.exec(styleValue)
      }
    })

    matches.sort((a, b) => a.index - b.index)
    matches.forEach(({ full }) => {
      const tempVar = `variable_temp_${counter}`
      variableMap[tempVar] = full
      sanitizedValue = sanitizedValue.replace(full, ` ${tempVar} `)
      counter += 1
    })

    sanitizedValue = sanitizedValue.replace(/\s+/g, ' ').trim()
    return `style="${sanitizedValue}"`
  })

  // <style> ... </style>
  result = result.replace(/<style(?:\b[^>]*)?>([\s\S]*?)<\/style\s*>/g, (block, content) => {
    let sanitizedContent = content
    const styleMatches = []

    syntaxes.forEach(({ prefix, suffix }) => {
      const regex = new RegExp(
        `:\\s*${escapeRegex(prefix)}\\s*([\\s\\S]*?)\\s*${escapeRegex(suffix)}`,
        'g',
      )
      let m = regex.exec(content)
      while (m) {
        const fullToken = m[0].replace(/^\s*:\s*/, '')
        styleMatches.push({ index: m.index, full: fullToken })
        m = regex.exec(content)
      }
    })

    styleMatches.sort((a, b) => a.index - b.index)
    styleMatches.forEach(({ full }) => {
      const tempVar = `variable_temp_${counter}`
      variableMap[tempVar] = full
      sanitizedContent = sanitizedContent.replace(full, ` ${tempVar} `)
      counter += 1
    })

    return block.replace(content, sanitizedContent)
  })

  return { result, variableMap }
}

function restoreCssValueVariablesHtml(html, variableMap) {
  let restoredHtml = html
  Object.entries(variableMap).forEach(([tempVar, originalVar]) => {
    const regex = new RegExp(`\\b${tempVar}\\b`, 'g')
    restoredHtml = restoredHtml.replace(regex, originalVar)
  })
  return restoredHtml
}

function sanitizeCssPropertyVariablesHtml(html, syntaxes) {
  let counter = 0
  const propMap = {}

  // style="..."
  let result = html.replace(/style="([^"]*)"/g, (match, styleValue) => {
    let sanitizedValue = styleValue
    const matches = []

    syntaxes.forEach(({ prefix, suffix }) => {
      const regex = new RegExp(
        `${escapeRegex(prefix)}\\s*([\\s\\S]*?)\\s*${escapeRegex(suffix)}\\s*:`,
        'g',
      )
      let m = regex.exec(styleValue)
      while (m) {
        matches.push({ index: m.index, full: m[0], varOnly: m[1] })
        m = regex.exec(styleValue)
      }
    })

    // Replace from left to right
    matches.sort((a, b) => a.index - b.index)
    matches.forEach(({ full }) => {
      const tempVar = `--mj-prop-temp_${counter}`
      const originalToken = full.replace(/\s*:\s*$/, '')
      propMap[tempVar] = originalToken
      sanitizedValue = sanitizedValue.replace(full, `${tempVar}:`)
      counter += 1
    })

    sanitizedValue = sanitizedValue.replace(/\s+/g, ' ').trim()
    return `style="${sanitizedValue}"`
  })

  // <style> ... </style>
  result = result.replace(/<style(?:\b[^>]*)?>([\s\S]*?)<\/style\s*>/g, (block, content) => {
    let sanitizedContent = content
    const styleMatches = []

    syntaxes.forEach(({ prefix, suffix }) => {
      const regex = new RegExp(
        `${escapeRegex(prefix)}\\s*([\\s\\S]*?)\\s*${escapeRegex(suffix)}\\s*:`,
        'g',
      )
      let m = regex.exec(content)
      while (m) {
        styleMatches.push({ index: m.index, full: m[0], varOnly: m[1] })
        m = regex.exec(content)
      }
    })

    styleMatches.sort((a, b) => a.index - b.index)
    styleMatches.forEach(({ full }) => {
      const tempVar = `--mj-prop-temp_${counter}`
      const originalToken = full.replace(/\s*:\s*$/, '')
      propMap[tempVar] = originalToken
      sanitizedContent = sanitizedContent.replace(full, `${tempVar}:`)
      counter += 1
    })

    return block.replace(content, sanitizedContent)
  })

  return { result, propMap }
}

function restoreCssPropertyVariablesHtml(html, propMap) {
  let restoredHtml = html
  Object.entries(propMap).forEach(([tempVar, originalVar]) => {
    const regex = new RegExp(`${escapeRegex(tempVar)}\\s*:`, 'g')
    restoredHtml = restoredHtml.replace(regex, `${originalVar}:`)
  })
  return restoredHtml
}

function detectVariableTypeInHtml(html, syntaxes) {
  const styleAttrValues = []
  html.replace(/style="([^"]*)"/g, (m, val) => {
    styleAttrValues.push(val)
    return m
  })
  const styleBlockValues = []
  html.replace(/<style(?:\b[^>]*)?>([\s\S]*?)<\/style\s*>/g, (m, val) => {
    styleBlockValues.push(val)
    return m
  })
  const styleContent = [...styleAttrValues, ...styleBlockValues].join('\n')

    const cssValuePattern = syntaxes
      .map(({ prefix }) => `[a-z-]+\\s*:\\s*[^;}"]*${escapeRegex(prefix)}`)
    .join('|')

  const isValueVariable = new RegExp(cssValuePattern, 'i').test(styleContent)

  const cssPropertyPattern = syntaxes
    .map(({ prefix, suffix }) => `${escapeRegex(prefix)}[^${escapeRegex(prefix)}${escapeRegex(suffix)}]*${escapeRegex(suffix)}\\s*:`)
    .join('|')
  const isPropertyVariable = new RegExp(cssPropertyPattern, 'i').test(styleContent)

  const allVariablesPattern = syntaxes
    .map(({ prefix, suffix }) => `${escapeRegex(prefix)}[^${escapeRegex(prefix)}${escapeRegex(suffix)}]*${escapeRegex(suffix)}`)
    .join('|')

  const allVariablesRegex = new RegExp(allVariablesPattern, 'g')
  let isBlockVariable = false

  let match = allVariablesRegex.exec(styleContent)
  while (match) {
    const beforeVar = styleContent.substring(0, match.index)
    const afterIndex = match.index + match[0].length
    const afterVar = styleContent.substring(afterIndex)
    const isCssValueCtx = /:[^;{]*$/.test(beforeVar)
    const isCssPropertyCtx = /^\s*:/.test(afterVar)
    if (!isCssValueCtx && !isCssPropertyCtx) {
      isBlockVariable = true
      break
    }
    match = allVariablesRegex.exec(styleContent)
  }

  return { isBlockVariable, isValueVariable, isPropertyVariable }
}

function detectBrokenTemplateDelimitersInCss(html, syntaxes) {
  const styleAttrValues = []
  html.replace(/style="([^"]*)"/g, (m, val) => {
    styleAttrValues.push(val)
    return m
  })
  const styleBlockValues = []
  html.replace(/<style(?:\b[^>]*)?>([\s\S]*?)<\/style\s*>/g, (m, val) => {
    styleBlockValues.push(val)
    return m
  })
  const styleContent = [...styleAttrValues, ...styleBlockValues].join('\n')

  const broken = []
  syntaxes.forEach(({ prefix, suffix }) => {
    const prefixRegex = new RegExp(escapeRegex(prefix), 'g')
    const suffixRegex = new RegExp(escapeRegex(suffix), 'g')
    const prefixCount = (styleContent.match(prefixRegex) || []).length
    const suffixCount = (styleContent.match(suffixRegex) || []).length
    if (prefixCount !== suffixCount) {
      broken.push({ prefix, suffix, prefixCount, suffixCount })
    }
  })

  return broken
}

function stripOutlookConditionalComments(html) {
  return html
    .replace(/<!--\[if mso \| IE\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--\[if mso\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--\[if !mso \| IE\]><!-->[\s\S]*?<!\[endif\]-->/gi, '')
}

function getAttr(attrs, name) {
  const re = new RegExp(`${name}=["']([^"']*)["']`, 'i')
  const m = attrs.match(re)
  return m ? m[1].trim() : null
}

async function fetchImageDimensionsForAmpImg(html, options = {}) {
  const { timeout = 5000 } = options
  let imageSize
  try {
    imageSize = require('image-size')
  } catch (e) {
    return html
  }
  const regex = /<amp-img\s+([^>]*?)>/gi
  const tags = []
  let m
  while ((m = regex.exec(html)) !== null) {
    const attrs = m[1]
    const layout = getAttr(attrs, 'layout')
    // Skip layout="fixed": those are display-size (e.g. icon 30px), not aspect-ratio; replacing would break display size
    if (layout === 'fixed') continue
    const src = getAttr(attrs, 'src')
    const w = getAttr(attrs, 'width')
    const h = getAttr(attrs, 'height')
    const width = w != null ? parseInt(w, 10) : null
    const height = h != null ? parseInt(h, 10) : null
    if (src && width != null && height != null) {
      if (!/^https?:\/\//i.test(src) || /\{\{|\}\}|\[\[|\]\]/.test(src)) continue
      tags.push({ index: m.index, fullMatch: m[0], attrs, src, width, height })
    }
  }
  const urlToDims = {}
  const fetchUrl = (url) => {
    if (urlToDims[url]) return Promise.resolve(urlToDims[url])
    return new Promise((resolve) => {
      const protocol = url.startsWith('https') ? require('https') : require('http')
      const req = protocol.get(url, { timeout }, (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          try {
            const buffer = Buffer.concat(chunks)
            const dims = imageSize(buffer)
            if (dims && dims.width && dims.height) {
              urlToDims[url] = { width: dims.width, height: dims.height }
            }
          } catch (err) {
            // ignore
          }
          resolve(urlToDims[url] || null)
        })
      })
      req.on('error', () => resolve(null))
      req.on('timeout', () => {
        req.destroy()
        resolve(null)
      })
    })
  }
  await Promise.all(
    map(
      reduce(tags, (acc, t) => (acc.includes(t.src) ? acc : [...acc, t.src]), []),
      (url) => fetchUrl(url),
    ),
  )
  if (isEmpty(urlToDims)) return html
  let out = html
  for (let i = tags.length - 1; i >= 0; i--) {
    const { index, fullMatch, attrs, src } = tags[i]
    const dims = urlToDims[src]
    if (!dims) continue
    const newAttrs = attrs
      .replace(/\bwidth=["'][^"']*["']/i, `width="${dims.width}"`)
      .replace(/\bheight=["'][^"']*["']/i, `height="${dims.height}"`)
    const newTag = `<amp-img ${newAttrs}>`
    out = out.substring(0, index) + newTag + out.substring(index + fullMatch.length)
  }
  return out
}

/**
 * Fetch a URL and return response body as UTF-8 string. Follows one redirect.
 * Resolves with null on error or non-2xx.
 */
function fetchUrlText(url, options = {}) {
  const { timeout = 8000, userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } = options
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? require('https') : require('http')
    const req = protocol.get(
      url,
      {
        timeout,
        headers: { 'User-Agent': userAgent },
        ...(options.requestOptions || {}),
      },
      (res) => {
        const isRedirect = res.statusCode >= 301 && res.statusCode <= 308
        const location = res.headers.location
        if (isRedirect && location) {
          const nextUrl = location.startsWith('http') ? location : new URL(location, url).href
          fetchUrlText(nextUrl, { ...options, requestOptions: {} })
            .then(resolve)
            .catch(() => resolve(null))
          return
        }
        if (res.statusCode !== 200) {
          resolve(null)
          return
        }
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          try {
            resolve(Buffer.concat(chunks).toString('utf8'))
          } catch {
            resolve(null)
          }
        })
      },
    )
    req.on('error', () => resolve(null))
    req.on('timeout', () => {
      req.destroy()
      resolve(null)
    })
  })
}

/** Strip @import rules from CSS (AMP amp-custom does not allow @import). */
function stripCssImport(css) {
  if (typeof css !== 'string') return ''
  return css.replace(/@import\s+[^;]+;?\s*/gi, '').trim()
}

/** Extract URLs from @import url(...) in CSS. */
function extractImportUrls(css) {
  if (typeof css !== 'string') return []
  const matches = css.match(/@import\s+url\s*\(\s*["']?([^"')]+)["']?\s*\)\s*;?/gi)
  if (!matches) return []
  return map(matches, (m) => {
    const u = m.match(/url\s*\(\s*["']?([^"')]+)["']?\s*\)/i)
    return u ? u[1].trim() : null
  }).filter(Boolean)
}

/**
 * Fetch font stylesheet URLs and return concatenated CSS for amp-custom.
 * Resolves @import url(...) (e.g. Google Fonts) and strips @import; inlines @font-face.
 * @see https://amp.dev/documentation/guides-and-tutorials/develop/style_and_layout/custom_fonts
 */
async function fetchFontCssForAmp(urls) {
  if (!urls || urls.length === 0) return ''
  const seen = new Set()
  async function fetchOne(url) {
    if (seen.has(url)) return ''
    seen.add(url)
    const text = await fetchUrlText(url)
    if (!text) return ''
    const importUrls = extractImportUrls(text)
    let css = stripCssImport(text)
    if (importUrls.length > 0) {
      const resolved = await Promise.all(map(importUrls, fetchOne))
      css = resolved.filter(Boolean).join('\n') + (css ? '\n' + css : '')
    }
    return css
  }
  const results = await Promise.all(map(urls, fetchOne))
  return results.filter(Boolean).join('\n')
}

function sanitizeHtmlForAmpEmail(html) {
  let out = stripOutlookConditionalComments(html)
  // AMP4EMAIL: only <link> from allowlisted font origins are allowed; strip other link tags
  out = out.replace(/<link\s+([^>]*)\/?>/gi, (match, attrs) => {
    const hrefMatch = attrs.match(/href\s*=\s*["']([^"']*)["']/i)
    if (!hrefMatch) return ''
    return isAllowlistedFontUrl(hrefMatch[1]) ? match : ''
  })
  // AMP4EMAIL: <img> is disallowed, use <amp-img> with layout and numeric width/height; output full element so tag is closed
  out = out.replace(/<img\s+([^>]*?)\s*\/?\s*>/gi, (_, attrs) => {
    let a = attrs.replace(/\s*\/\s*$/, '').trim()
    a = a.replace(/(\b(?:width|height))=["'](\d+)px["']/gi, '$1="$2"')
    if (!/\bwidth\s*=/.test(a)) a += ' width="1"'
    if (!/\bheight\s*=/.test(a)) a += ' height="1"'
    return `<amp-img layout="responsive" ${a}></amp-img>`
  })
  // AMP4EMAIL: table cell images - unwrap td > div > amp-img to td > amp-img so clients that strip div or mis-handle nesting still show the image
  out = out.replace(
    /<td([^>]*)>(\s*)<div([^>]*)>(\s*)<amp-img\s+([^>]*?)><\/amp-img>\s*<\/div>/gi,
    (m, tdAttrs, s1, divAttrs, s2, ampAttrs) => {
      const divStyle = getAttr(divAttrs, 'style') || ''
      const tdStyle = getAttr(tdAttrs, 'style') || ''
      const merged = [tdStyle, divStyle].filter(Boolean).join(';').replace(/;+/g, ';').replace(/^;|;$/g, '')
      const tdAttrsNoStyle = tdAttrs.replace(/\s*style=["'][^"']*["']/gi, '').trim()
      const styleAttr = merged ? ` style="${merged}"` : ''
      const attrs = [tdAttrsNoStyle, styleAttr].filter(Boolean).join(' ')
      return `<td ${attrs}>${s1}<amp-img ${ampAttrs}></amp-img>`
    },
  )
  // AMP4EMAIL: relative href="#" is disallowed
  out = out.replace(/href=["']#["']/gi, 'href="https://example.com/"')
  // AMP4EMAIL: strip disallowed inline CSS (!important, cursor:auto, mso-*, -webkit-background-clip, -moz-user-select, user-select)
  out = out.replace(/style="([^"]*)"/g, (_, style) => {
    const s = style
      .replace(/\s*!important\s*/gi, ' ')
      .replace(/\s*mso-padding-alt\s*:[^;]+;?/gi, '')
      .replace(/\s*mso-hide\s*:[^;]+;?/gi, '')
      .replace(/\s*cursor\s*:\s*auto\s*;?/gi, '')
      .replace(/\s*-webkit-background-clip\s*:[^;]+;?/gi, '')
      .replace(/\s*-moz-user-select\s*:[^;]+;?/gi, '')
      .replace(/\s*user-select\s*:[^;]+;?/gi, '')
      .trim()
      .replace(/;\s*;+/g, ';')
      .replace(/^;\s*|;\s*$/g, '')
    return s ? `style="${s}"` : ''
  })
  // AMP4EMAIL: <strike> is disallowed; use span with text-decoration
  out = out.replace(/<strike\s*([^>]*)>([\s\S]*?)<\/strike\s*>/gi, (_, attrs, inner) => {
    const style = getAttr(attrs, 'style') || ''
    const add = 'text-decoration:line-through'
    const newStyle = style ? `${style};${add}` : add
    return `<span style="${newStyle}">${inner}</span>`
  })
  // AMP4EMAIL: align on <label> is disallowed
  out = out.replace(/<label\s+([^>]*)>/gi, (_, attrs) => {
    const cleaned = attrs.replace(/\s*align\s*=\s*["'][^"']*["']/gi, '').trim()
    return `<label ${cleaned}>`
  })
  // AMP4EMAIL: strip disallowed properties from amp-custom CSS (!important, -webkit-background-clip, etc.)
  out = out.replace(/<style\s+amp-custom[^>]*>([\s\S]*?)<\/style\s*>/gi, (_, css) => {
    const cleaned = css
      .replace(/\s*!important\s*/gi, ' ')
      .replace(/\s*-webkit-background-clip\s*:[^;}+]+;?/g, '')
      .replace(/\s*-moz-user-select\s*:[^;}+]+;?/g, '')
      .replace(/\s*user-select\s*:[^;}+]+;?/g, '')
      .replace(/\s*;+\s*/g, ';')
      .replace(/^\s*;|;\s*$/g, '')
      .trim()
    return `<style amp-custom>${cleaned}</style>`
  })
  return out
}

class ValidationError extends Error {
  constructor(message, errors) {
    super(message)

    this.errors = errors
  }
}

export default async function mjml2html(mjml, options = {}) {
  let content = ''
  let errors = []

  // Resolve skeleton path if in Node.js
  if (isNode && typeof options.skeleton === 'string') {
    // eslint-disable-next-line global-require
    const path = require('path')
    const sk = options.skeleton
    const resolved = path.isAbsolute(sk) ? sk : path.resolve(process.cwd(), sk)
    // eslint-disable-next-line global-require, import/no-dynamic-require
    options.skeleton = require(resolved)
  }

  let packages = {}
  let confOptions = {}
  let mjmlConfigOptions = {}
  let confPreprocessors = []
  let error = null
  let componentRootPath = null

  // Use the existing readMjmlConfig helper
  if ((isNode && options.useMjmlConfigOptions) || options.mjmlConfigPath) {
    const mjmlConfigContent = readMjmlConfig(options.mjmlConfigPath)

    if (mjmlConfigContent) {
      // The options can be nested one or two levels deep.
      // This safely gets the options from either structure.
      confOptions =
        get(mjmlConfigContent, 'mjmlConfig.mjmlConfig.options') || // For double-nested structure
        get(mjmlConfigContent, 'mjmlConfig.options') || // For single-nested structure
        get(mjmlConfigContent, 'options') || // If options are at the top level
        confOptions

      // This safely gets packages and preprocessors
      const packagesWrapper =
        get(mjmlConfigContent, 'mjmlConfig.mjmlConfig') ||
        get(mjmlConfigContent, 'mjmlConfig') ||
        mjmlConfigContent
      packages = packagesWrapper.packages || packages
      confPreprocessors = packagesWrapper.preprocessors || confPreprocessors

      componentRootPath =
        mjmlConfigContent.componentRootPath || componentRootPath
      error = mjmlConfigContent.error || error
    }

    if (options.useMjmlConfigOptions) {
      mjmlConfigOptions = confOptions || {}
    }
  }

  // if mjmlConfigPath is specified then we need to register components it on each call
  if (isNode && !error && options.mjmlConfigPath) {
    if (Array.isArray(packages) && packages.length > 0) {
      handleMjmlConfigComponents(packages, componentRootPath, registerComponent)
    }
  }

  // Merge config options with explicit options (explicit wins)
  const mergedOptions = {
    ...mjmlConfigOptions,
    ...options,
    // Deep merge minifyOptions
    minifyOptions: {
      ...(mjmlConfigOptions.minifyOptions || {}),
      ...(options.minifyOptions || {}),
    },
    // Merge preprocessors arrays
    preprocessors: options.preprocessors
      ? [...confPreprocessors, ...options.preprocessors]
      : confPreprocessors,
  }

  const {
    beautify = false,
    fonts = {
      'Open Sans':
        'https://fonts.googleapis.com/css?family=Open+Sans:300,400,500,700',
      'Droid Sans':
        'https://fonts.googleapis.com/css?family=Droid+Sans:300,400,500,700',
      Lato: 'https://fonts.googleapis.com/css?family=Lato:300,400,500,700',
      Roboto: 'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700',
      Ubuntu: 'https://fonts.googleapis.com/css?family=Ubuntu:300,400,500,700',
    },
    keepComments = true,
    minify = false,
    minifyOptions,
    ignoreIncludes = true,
    juiceOptions = {},
    juicePreserveTags = null,
    skeleton = defaultSkeleton,
    validationLevel = 'soft',
    filePath = '.',
    actualPath = '.',
    preprocessors,
    presets = [],
    printerSupport = false,
    sanitizeStyles = false,
    templateSyntax,
    allowMixedSyntax = false,
    fetchFontsForAmp = true,
  } = mergedOptions

  const components = { ...globalComponents }
  const dependencies = assignDependencies({}, globalDependencies)
  for (const preset of presets) {
    assignComponents(components, preset.components)
    assignDependencies(dependencies, preset.dependencies)
  }

  if (typeof mjml === 'string') {
    mjml = MJMLParser(mjml, {
      keepComments,
      components,
      filePath,
      actualPath,
      preprocessors,
      ignoreIncludes,
    })
  }

  const globalData = {
    beforeDoctype: '',
    breakpoint: '480px',
    classes: {},
    classesDefault: {},
    defaultAttributes: {},
    htmlAttributes: {},
    fonts,
    inlineStyle: [],
    headStyle: {},
    componentsHeadStyle: [],
    headRaw: [],
    mediaQueries: {},
    preview: '',
    style: [],
    title: '',
    forceOWADesktop: get(mjml, 'attributes.owa', 'mobile') === 'desktop',
    lang: get(mjml, 'attributes.lang') || 'und',
    dir: get(mjml, 'attributes.dir') || 'auto',
  }

  const validatorOptions = {
    components,
    dependencies,
    initializeType,
  }

  switch (validationLevel) {
    case 'skip':
      break

    case 'strict':
      errors = MJMLValidator(mjml, validatorOptions)

      if (errors.length > 0) {
        throw new ValidationError(
          `ValidationError: \n ${errors
            .map((e) => e.formattedMessage)
            .join('\n')}`,
          errors,
        )
      }
      break

    case 'soft':
    default:
      errors = MJMLValidator(mjml, validatorOptions)
      break
  }

  const mjBody = find(mjml.children, { tagName: 'mj-body' })
  const mjHead = find(mjml.children, { tagName: 'mj-head' })
  const mjOutsideRaws = filter(mjml.children, { tagName: 'mj-raw' })

  const processing = (node, context, parseMJML = identity) => {
    if (!node) {
      return
    }

    const component = initComponent({
      name: node.tagName,
      initialDatas: {
        ...parseMJML(node),
        context,
      },
    })

    if (component !== null) {
      if ('handler' in component) {
        return component.handler() // eslint-disable-line consistent-return
      }

      if ('render' in component) {
        return component.render() // eslint-disable-line consistent-return
      }
    }
  }

  const applyAttributes = (mjml) => {
    const parse = (mjml, parentMjClass = '') => {
      const { attributes, tagName, children } = mjml
      const classes = get(mjml.attributes, 'mj-class', '').split(' ')
      const attributesClasses = reduce(
        classes,
        (acc, value) => {
          const mjClassValues = globalData.classes[value]
          let multipleClasses = {}
          if (acc['css-class'] && get(mjClassValues, 'css-class')) {
            multipleClasses = {
              'css-class': `${acc['css-class']} ${mjClassValues['css-class']}`,
            }
          }

          return {
            ...acc,
            ...mjClassValues,
            ...multipleClasses,
          }
        },
        {},
      )

      const defaultAttributesForClasses = reduce(
        parentMjClass.split(' '),
        (acc, value) => ({
          ...acc,
          ...get(globalData.classesDefault, `${value}.${tagName}`),
        }),
        {},
      )
      const nextParentMjClass = get(attributes, 'mj-class', parentMjClass)

      return {
        ...mjml,
        attributes: {
          ...globalData.defaultAttributes[tagName],
          ...attributesClasses,
          ...defaultAttributesForClasses,
          ...omit(attributes, ['mj-class']),
        },
        rawAttrs: { ...omit(attributes, ['mj-class']) },
        globalAttributes: {
          ...globalData.defaultAttributes['mj-all'],
        },
        children: map(children, (mjml) => parse(mjml, nextParentMjClass)),
      }
    }

    return parse(mjml)
  }

  const bodyHelpers = {
    components,
    globalData,
    addMediaQuery(className, { parsedWidth, unit }) {
      globalData.mediaQueries[className] =
        `{ width:${parsedWidth}${unit} !important; max-width: ${parsedWidth}${unit}; }`
    },
    addHeadStyle(identifier, headStyle) {
      globalData.headStyle[identifier] = headStyle
    },
    addComponentHeadSyle(headStyle) {
      globalData.componentsHeadStyle.push(headStyle)
    },
    getGlobalDatas: () => globalData,
    processing: (node, context) => processing(node, context, applyAttributes),
  }

  const headHelpers = {
    components,
    globalData,
    add(attr, ...params) {
      if (Array.isArray(globalData[attr])) {
        globalData[attr].push(...params)
      } else if (Object.prototype.hasOwnProperty.call(globalData, attr)) {
        if (params.length > 1) {
          if (isObject(globalData[attr][params[0]])) {
            globalData[attr][params[0]] = {
              ...globalData[attr][params[0]],
              ...params[1],
            }
          } else {
            // eslint-disable-next-line prefer-destructuring
            globalData[attr][params[0]] = params[1]
          }
        } else {
          // eslint-disable-next-line prefer-destructuring
          globalData[attr] = params[0]
        }
      } else {
        throw Error(
          `An mj-head element add an unkown head attribute : ${attr} with params ${
            Array.isArray(params) ? params.join('') : params
          }`,
        )
      }
    },
  }

  globalData.headRaw = processing(mjHead, headHelpers)

  content = processing(mjBody, bodyHelpers, applyAttributes)

  if (!content) {
    throw new Error(
      'Malformed MJML. Check that your structure is correct and enclosed in <mjml> tags.',
    )
  }

  // AMP: skip Outlook conditionals
  // content = minifyOutlookConditionnals(content)

  if (mjOutsideRaws.length) {
    const toAddBeforeDoctype = mjOutsideRaws.filter(
      (elt) =>
        elt.attributes.position && elt.attributes.position === 'file-start',
    )
    if (toAddBeforeDoctype.length) {
      globalData.beforeDoctype = toAddBeforeDoctype
        .map((elt) => elt.content)
        .join('\n')
    }
  }

  if (!isEmpty(globalData.htmlAttributes)) {
    const $ = load(content, {
      xmlMode: true, // otherwise it may move contents that aren't in any tag
      decodeEntities: false, // won't escape special characters
    })

    each(globalData.htmlAttributes, (data, selector) => {
      each(data, (value, attrName) => {
        $(selector).each(function getAttr() {
          $(this).attr(attrName, value || '')
        })
      })
    })

    content = $.root().html()
  }
  const ampBaseCss = [
    '#outlook a { padding:0; }',
    'body { margin:0;padding:0;}',
    'table, td { border-collapse:collapse; }',
    'img { border:0;height:auto;line-height:100%; outline:none;text-decoration:none; }',
    'p { display:block;margin:13px 0; }',
  ].join('\n')
  let ampCustomCss = [
    ampBaseCss,
    buildAmpCustomCssContent(
      globalData.breakpoint,
      globalData.componentsHeadStyle,
      globalData.headStyle,
      globalData.style,
    ),
    buildMediaQueriesAmpCss(globalData.breakpoint, globalData.mediaQueries),
  ]
    .filter(Boolean)
    .join('\n')
    .replace(/\s*!important\s*/gi, ' ')
    .replace(/\[\s*href\s*\]/g, '')

  // AMP4EMAIL: custom fonts via @font-face in amp-custom (allowed per spec); <link> only when fetch disabled or failed
  let fontsHtml = buildFontsTagsAmp(content, globalData.inlineStyle, fonts)
  if (isNode && fetchFontsForAmp === true) {
    const fontUrls = getFontUrlsForAmp(content, globalData.inlineStyle, fonts)
    const fontCss = await fetchFontCssForAmp(fontUrls)
    // Inline font CSS (including @font-face) into amp-custom; @import resolved and stripped in fetchFontCssForAmp
    if (fontCss) {
      ampCustomCss = fontCss + '\n' + ampCustomCss
      fontsHtml = '' // avoid duplicate load: use @font-face only
    }
  }

  content = skeleton({
    content,
    ...globalData,
    printerSupport,
    ampCustomCss,
    fontsHtml,
  })

  if (globalData.inlineStyle.length > 0) {
    if (juicePreserveTags) {
      each(juicePreserveTags, (val, key) => {
        juice.codeBlocks[key] = val
      })
    }

    content = juice(content, {
      applyStyleTags: false,
      extraCss: globalData.inlineStyle.join(''),
      insertPreservedExtraCss: false,
      removeStyleTags: false,
      ...juiceOptions,
    })
  }

  // AMP: skip Outlook conditionals
  // content = mergeOutlookConditionnals(content)

  // PostProcessors
  if (minify) {
    let normalizedMinifyOptions = minifyOptions
    if (
      minifyOptions &&
      typeof minifyOptions.minifyCss === 'undefined' &&
      typeof minifyOptions.minifyCSS !== 'undefined'
    ) {
      const mapped = minifyOptions.minifyCSS ? { preset: 'lite' } : false
      const { minifyCSS, ...rest } = minifyOptions
      normalizedMinifyOptions = { ...rest, minifyCss: mapped }
    }

    const { minifyCss: userMinifyCss, ...minifyOptionsRest } =
      normalizedMinifyOptions || {}

    let resolvedUserMinifyCss
    if (typeof userMinifyCss !== 'undefined') {
      if (userMinifyCss.options) {
        resolvedUserMinifyCss = userMinifyCss.options
      } else {
        resolvedUserMinifyCss = userMinifyCss
      }
    } else {
      resolvedUserMinifyCss = undefined
    }

    const htmlnanoOptions = {
      collapseWhitespace: true,
      minifyCss:
        typeof resolvedUserMinifyCss !== 'undefined'
          ? resolvedUserMinifyCss
          : { preset: 'lite' },
      removeEmptyAttributes: true,
      minifyJs: false,
      removeComments: keepComments ? false : 'safe',
      ...minifyOptionsRest,
    }

    let didSanitize = false
    let isBlockVariable = false
    let variableMap = {}
    let propMap = {}
    const syntaxes =
      templateSyntax || [
        { prefix: '{{', suffix: '}}' },
        { prefix: '[[', suffix: ']]' },
      ]

    const cssMinifyEnabled = htmlnanoOptions.minifyCss !== false
    if (sanitizeStyles === true && cssMinifyEnabled) {
      const broken = detectBrokenTemplateDelimitersInCss(content, syntaxes)
      if (broken.length) {
        const details = broken
          .map(
            (b) => `${b.prefix}…${b.suffix} (${b.prefixCount} open, ${b.suffixCount} close)`,
          )
          .join(', ')
        throw new Error(
          `Unbalanced template delimiters found in CSS: ${details}. Fix template tokens or disable CSS minification via --config.minifyOptions '{"minifyCss": false}'.`,
        )
      }
      const detected = detectVariableTypeInHtml(content, syntaxes)
      isBlockVariable = detected.isBlockVariable
      if (!allowMixedSyntax && isBlockVariable && (detected.isValueVariable || detected.isPropertyVariable)) {
        throw new Error(
          'Mixed variable syntax detected. Use either CSS property syntax (e.g., color: {{variable}}) OR block syntax (e.g., {{variable}}), not both in the same document.',
        )
      }
      if (detected.isValueVariable) {
        const sanitized = sanitizeCssValueVariablesHtml(content, syntaxes)
        content = sanitized.result
        variableMap = sanitized.variableMap
        didSanitize = true
      }
      if (detected.isPropertyVariable) {
        const sanitizedProp = sanitizeCssPropertyVariablesHtml(content, syntaxes)
        content = sanitizedProp.result
        propMap = sanitizedProp.propMap
        didSanitize = true
      }
      if (isBlockVariable) {
        content = sanitizeInlineStyleAttributes(content, syntaxes)
        content = sanitizeStyleTagBlocks(content, syntaxes)
        didSanitize = true
      }
    }

    content = await minifier.process(content, htmlnanoOptions).then((res) => res.html)

    if (didSanitize) {
      // Always restore CSS value/property placeholders when present
      if (variableMap && Object.keys(variableMap).length > 0) {
        content = restoreCssValueVariablesHtml(content, variableMap)
      }
      if (propMap && Object.keys(propMap).length > 0) {
        content = restoreCssPropertyVariablesHtml(content, propMap)
      }

      // Additionally restore block-style tokens if they were detected
      if (isBlockVariable) {
        content = restoreInlineStyleAttributes(content, syntaxes)
        content = restoreStyleTagBlocks(content, syntaxes)
      }
    }
  } else if (beautify) {
    content = await prettier.format(content, {
      parser: 'html',
      printWidth: 240,
    })
  }

  content = sanitizeHtmlForAmpEmail(content)

  if (isNode && mergedOptions.fetchImageDimensions) {
    content = await fetchImageDimensionsForAmpImg(content, {
      timeout: mergedOptions.fetchImageDimensionsTimeout ?? 5000,
    })
  }

  return {
    html: content,
    json: mjml,
    errors,
  }
}

if (isNode) {
  handleMjmlConfig(process.cwd(), registerComponent)
}

export {
  globalComponents as components,
  initComponent,
  registerComponent,
  assignComponents,
  makeLowerBreakpoint,
  suffixCssClasses,
  handleMjmlConfig,
  initializeType,
}

export { BodyComponent, HeadComponent } from './createComponent'
