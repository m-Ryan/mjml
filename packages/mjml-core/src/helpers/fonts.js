import { forEach, map } from 'lodash'

/**
 * AMP4EMAIL 允许通过 <link> 加载字体的来源（白名单）。
 * @see https://amp.dev/documentation/guides-and-tutorials/email/develop/style_and_layout/custom_fonts
 */
export const AMP4EMAIL_FONT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://use.typekit.net',
  'https://cloud.typography.com',
  'https://fast.fonts.net',
  'https://maxcdn.bootstrapcdn.com',
  'https://use.fontawesome.com',
]

export function isAllowlistedFontUrl(url) {
  if (!url || typeof url !== 'string') return false
  const normalized = url.trim()
  return AMP4EMAIL_FONT_ORIGINS.some((origin) => normalized.startsWith(origin))
}

// eslint-disable-next-line import/prefer-default-export
export function buildFontsTags(content, inlineStyle, fonts = {}) {
  const toImport = []

  forEach(fonts, (url, name) => {
    const regex = new RegExp(`"[^"]*font-family:[^"]*${name}[^"]*"`, 'gmi')
    const inlineRegex = new RegExp(`font-family:[^;}]*${name}`, 'gmi')

    if (content.match(regex) || inlineStyle.some((s) => s.match(inlineRegex))) {
      toImport.push(url)
    }
  })

  if (toImport.length > 0) {
    return `
      <!--[if !mso]><!-->
        ${map(
          toImport,
          (url) => `<link href="${url}" rel="stylesheet" type="text/css">`,
        ).join('\n')}
        <style type="text/css">
          ${map(toImport, (url) => `@import url(${url});`).join('\n')}
        </style>
      <!--<![endif]-->\n
    `
  }

  return ''
}

/**
 * Returns only <link> tags for fonts from allowlisted origins (no MSO comments, no style).
 * Used by AMP skeleton; AMP4EMAIL allows <link> for fonts from Google Fonts, Typekit, etc.
 */
export function buildFontsTagsAmp(content, inlineStyle, fonts = {}) {
  const toImport = getFontUrlsForAmp(content, inlineStyle, fonts).filter(
    (url) => isAllowlistedFontUrl(url),
  )
  if (toImport.length > 0) {
    return map(
      toImport,
      (url) => `<link href="${url}" rel="stylesheet" type="text/css">`,
    ).join('\n')
  }
  return ''
}

/**
 * Returns array of font URLs that are actually used (same logic as buildFontsTagsAmp).
 * Used for AMP to fetch and inline @font-face CSS into amp-custom.
 */
export function getFontUrlsForAmp(content, inlineStyle, fonts = {}) {
  const toImport = []
  forEach(fonts, (url, name) => {
    const regex = new RegExp(`"[^"]*font-family:[^"]*${name}[^"]*"`, 'gmi')
    const inlineRegex = new RegExp(`font-family:[^;}]*${name}`, 'gmi')
    if (content.match(regex) || inlineStyle.some((s) => s.match(inlineRegex))) {
      toImport.push(url)
    }
  })
  return [...new Set(toImport)]
}

