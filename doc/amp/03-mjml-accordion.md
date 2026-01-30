# Block: mjml-accordion（含 Accordion / AccordionElement / AccordionTitle / AccordionText）

## 怎么转换

- **当前**：
  - **Accordion.js**：输出外层 `<table class="mj-accordion">`，子节点由 `renderChildren` 渲染；`headStyle` 产出大量 CSS（`.mj-accordion-checkbox`、`+ *` 选择器、`@media yahoo`、`.moz-text-html`、`@goodbye { @gmail }` 等），依赖 **input[type=checkbox] + label + div** 和兄弟选择器实现展开/收起。
  - **AccordionElement.js**：每个 item 为 `<tr><td><label class="mj-accordion-element">` 内嵌 `conditionalTag(<input class="mj-accordion-checkbox" type="checkbox">)` 和 `<div>`，`handleMissingChildren` 里渲染 AccordionTitle / 子元素 / AccordionText。
  - **AccordionTitle.js**：标题行内有两枚 `<img>`（icon-wrapped / icon-unwrapped），用 `conditionalTag` 包裹；标题文案在 td 中。
  - **AccordionText.js**：内容区，多为 div/表格。
- **改为 AMP 专用**：
  1. **Accordion.js**：不再输出 table+tbody+tr 的 checkbox 结构，改为输出 **`<amp-accordion>`**；子节点改为渲染为 **`<section>`** 列表，每个 section 内为 **`<h2>`（标题）** + **`<div>`（内容）**，符合 [AMP accordion 结构](https://amp.dev/documentation/components/amp-accordion/)。删除整个 `headStyle`（AMP 用组件自带交互，不需要 checkbox CSS）。
  2. **AccordionElement.js**：不再产出 `<tr><td><label>` 与 `<input type="checkbox">`，改为产出 **`<section>`**；内部调用子组件得到「标题」和「内容」两段，分别放进 `<h2>` 和 `<div>`（AMP 规定 expandable 的 header 用 h2，内容用 div）。
  3. **AccordionTitle.js**：标题文案放入 `<h2>`；两枚 **`<img>` 改为 `<amp-img>`**，需补全 width/height（如用 icon-width/icon-height 或默认 32）。若 AMP 不支持在 header 内放图标，可只保留文字或按 AMP 文档调整。
  4. **AccordionText.js**：原内容放入 `<div>` 即可，保持子节点不变；若有禁用标签再按 AMP 规范替换。

## 涉及文件

- `packages/mjml-accordion/src/Accordion.js`
- `packages/mjml-accordion/src/AccordionElement.js`
- `packages/mjml-accordion/src/AccordionTitle.js`
- `packages/mjml-accordion/src/AccordionText.js`（若有需要）

## 潜在问题与不能解决的

- **图标在 header 内**：AMP accordion 的 `<h2>` 内允许的内容可能有限制，若不允许 `amp-img` 或复杂结构，**可能无法保留「标题左侧/右侧图标」的版式**，只能保留文字或简化。
- **展开/收起动画与默认状态**：AMP 组件行为与当前 CSS 驱动可能不完全一致（如默认展开哪一项），**交互细节可能略有差异**。
- **@goodbye、.moz-text-html、@media yahoo**：这些客户端 hack 在 AMP 中均不可用，**Gmail/Thunderbird 等下的降级表现无法与原版一致**；AMP 邮件本身在这些客户端的支持也需单独查文档。
