import { BodyComponent, suffixCssClasses } from 'mjml-core'

export default class MjCarouselImage extends BodyComponent {
  static componentName = 'mj-carousel-image'

  static endingTag = true

  static allowedAttributes = {
    alt: 'string',
    href: 'string',
    rel: 'string',
    target: 'string',
    title: 'string',
    src: 'string',
    'thumbnails-src': 'string',
    'border-radius': 'unit(px,%){1,4}',
    'tb-border': 'string',
    'tb-border-radius': 'unit(px,%){1,4}',
  }

  static defaultAttributes = {
    alt: '',
    target: '_blank',
  }

  getStyles() {
    return {
      images: {
        img: {
          'border-radius': this.getAttribute('border-radius'),
          display: 'block',
          'max-width': '100%',
        },
        firstImageDiv: {},
      },
    }
  }

  hasThumbnailsSupported() {
    const thumbnails =
      this.getAttribute('thumbnails') || this.context.thumbnails
    return thumbnails === 'supported'
  }

  renderThumbnail() {
    const { carouselId, src, alt, 'tb-width': width, target } = this.attributes
    const imgIndex = this.props.index + 1
    const cssClass = suffixCssClasses(
      this.getAttribute('css-class'),
      'thumbnail',
    )

    return `
      <a
        ${this.htmlAttributes({
          style: 'thumbnails.a',
          href: `#${imgIndex}`,
          target,
          class: `mj-carousel-thumbnail mj-carousel-${carouselId}-thumbnail mj-carousel-${carouselId}-thumbnail-${imgIndex} ${cssClass}`,
        })}
      >
        <label ${this.htmlAttributes({
          for: `mj-carousel-${carouselId}-radio-${imgIndex}`,
        })}>
          <img
            ${this.htmlAttributes({
              style: 'thumbnails.img',
              src: this.getAttribute('thumbnails-src') || src,
              alt,
              width: parseInt(width, 10),
            })}
          />
        </label>
      </a>
    `
  }

  renderRadio() {
    const { index } = this.props
    const carouselId = this.getAttribute('carouselId')

    return `
      <input
        ${this.htmlAttributes({
          class: `mj-carousel-radio mj-carousel-${carouselId}-radio mj-carousel-${carouselId}-radio-${
            index + 1
          }`,
          checked: index === 0 ? 'checked' : null,
          type: 'radio',
          name: `mj-carousel-radio-${carouselId}`,
          id: `mj-carousel-${carouselId}-radio-${index + 1}`,
          style: 'radio.input',
        })}
      />
    `
  }

  render() {
    const { src, alt, href, rel, title } = this.attributes
    const { index } = this.props
    const width = parseInt(this.context.containerWidth, 10) || 600
    const height = width

    const ampImg = `
      <amp-img
        ${this.htmlAttributes({
          src,
          alt: alt || '',
          width,
          height,
          layout: 'responsive',
          title,
          style: 'images.img',
        })}
      ></amp-img>
    `

    const cssClass = this.getAttribute('css-class') || ''

    const content =
      href && href !== ''
        ? `<a ${this.htmlAttributes({ href, rel, target: '_blank' })}>${ampImg}</a>`
        : ampImg

    return `
      <div
        ${this.htmlAttributes({
          class: `mj-carousel-image mj-carousel-image-${index + 1} ${cssClass}`,
          style: 'images.firstImageDiv',
        })}
      >
        ${content}
      </div>
    `
  }
}
