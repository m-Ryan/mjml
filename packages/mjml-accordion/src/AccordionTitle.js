import { BodyComponent } from 'mjml-core'

export default class MjAccordionTitle extends BodyComponent {
  static componentName = 'mj-accordion-title'

  static endingTag = true

  static allowedAttributes = {
    'background-color': 'color',
    color: 'color',
    'font-size': 'unit(px)',
    'font-family': 'string',
    'font-weight': 'string',
    'padding-bottom': 'unit(px,%)',
    'padding-left': 'unit(px,%)',
    'padding-right': 'unit(px,%)',
    'padding-top': 'unit(px,%)',
    padding: 'unit(px,%){1,4}',
  }

  static defaultAttributes = {
    'font-size': '13px',
    padding: '16px',
  }

  getStyles() {
    return {
      span: {
        'background-color': this.getAttribute('background-color'),
        color: this.getAttribute('color'),
        'font-size': this.getAttribute('font-size'),
        'font-family': this.resolveFontFamily(),
        'font-weight': this.getAttribute('font-weight'),
        padding: this.getAttribute('padding'),
      },
    }
  }

  resolveFontFamily() {
    if (
      this.props &&
      this.props.rawAttrs &&
      Object.prototype.hasOwnProperty.call(this.props.rawAttrs, 'font-family')
    ) {
      return this.getAttribute('font-family')
    }
    if (this.context && this.context.elementFontFamily) {
      return this.context.elementFontFamily
    }
    if (this.context && this.context.accordionFontFamily) {
      return this.context.accordionFontFamily
    }
    return MjAccordionTitle.defaultAttributes.fontFamily
  }

  render() {
    const iconW = parseInt(this.getAttribute('icon-width'), 10) || 32
    const iconH = parseInt(this.getAttribute('icon-height'), 10) || 32
    const iconLeft = this.getAttribute('icon-position') === 'left'
    const wrappedUrl = this.getAttribute('icon-wrapped-url')
    const unwrappedUrl = this.getAttribute('icon-unwrapped-url')

    const textSpan = `<span ${this.htmlAttributes({ style: 'span' })}>${this.getContent()}</span>`
    const iconAmp =
      wrappedUrl && unwrappedUrl
        ? `<amp-img
        ${this.htmlAttributes({
          src: wrappedUrl,
          alt: this.getAttribute('icon-wrapped-alt') || '+',
          width: iconW,
          height: iconH,
          layout: 'fixed',
        })}
      ></amp-img>`
        : ''

    const parts = iconLeft ? [iconAmp, textSpan] : [textSpan, iconAmp]
    return parts.filter(Boolean).join(' ')
  }
}
