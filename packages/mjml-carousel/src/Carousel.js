import { BodyComponent } from 'mjml-core'

export default class MjCarousel extends BodyComponent {
  static componentName = 'mj-carousel'

  static allowedAttributes = {
    align: 'enum(left,center,right)',
    'border-radius': 'unit(px,%){1,4}',
    'container-background-color': 'color',
    'icon-width': 'unit(px,%)',
    'left-icon': 'string',
    padding: 'unit(px,%){1,4}',
    'padding-top': 'unit(px,%)',
    'padding-bottom': 'unit(px,%)',
    'padding-left': 'unit(px,%)',
    'padding-right': 'unit(px,%)',
    'right-icon': 'string',
    thumbnails: 'enum(visible,hidden,supported)',
    'tb-border': 'string',
    'tb-border-radius': 'unit(px,%)',
    'tb-hover-border-color': 'color',
    'tb-selected-border-color': 'color',
    'tb-width': 'unit(px,%)',
  }

  static defaultAttributes = {
    align: 'center',
    'border-radius': '6px',
    'icon-width': '44px',
    'left-icon': 'https://i.imgur.com/xTh3hln.png',
    'right-icon': 'https://i.imgur.com/os7o9kz.png',
    thumbnails: 'visible',
    'tb-border': '2px solid transparent',
    'tb-border-radius': '6px',
    'tb-hover-border-color': '#fead0d',
    'tb-selected-border-color': '#ccc',
  }

  componentHeadStyle = () => ''

  getStyles() {
    return {
      carousel: {
        width: '100%',
      },
    }
  }

  getChildContext() {
    return {
      ...this.context,
      thumbnails: this.getAttribute('thumbnails'),
    }
  }

  render() {
    return `
      <amp-carousel
        ${this.htmlAttributes({
          type: 'slides',
          class: 'mj-carousel',
          style: 'carousel',
        })}
      >
        ${this.renderChildren(this.props.children, {
          attributes: {
            'border-radius': this.getAttribute('border-radius'),
          },
        })}
      </amp-carousel>
    `
  }
}
