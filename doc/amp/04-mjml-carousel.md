# Block: mjml-carousel（Carousel + CarouselImage）

## 怎么转换

- **当前**：
  - **Carousel.js**：依赖 **radio input** 一组 + 复杂 `headStyle`（`.mj-carousel-radio:checked + * + ...` 等）切换显示哪张图；结构为 `generateRadios()`、`generateThumbnails()`、`generateCarousel()`，其中 `generateControls('previous'/'next')` 里用 **`<img>`** 做左右箭头；`renderFallback()` 用 `msoConditionalTag` 给 Outlook 只显示第一张图。
  - **CarouselImage.js**：每张图用 **`<img>`** 输出，带 radio、label、thumbnail 用 **`<img>`**；多图通过 CSS 控制只显示当前选中的一张。
- **改为 AMP 专用**：
  1. **Carousel.js**：不再使用 radio、label、多 div 切换；改为输出 **`<amp-carousel>`**，`type="slides"`（或 `carousel`，按 AMP 文档）。子节点由 `renderChildren` 产出，每个子项为 CarouselImage 输出的 **`<amp-img>`**（见下）。左右箭头：若 AMP 支持用 `controls` 等属性则用组件自带；否则若需自定义箭头，箭头图标需用 **`<amp-img>`** 并补全宽高。**删除** 整个 `componentHeadStyle`（carousel 用 AMP 组件交互）。**不再** 调用 `msoConditionalTag` 的 fallback（或改为不输出 Outlook 专用块）。
  2. **CarouselImage.js**：主图与缩略图处的 **`<img>` 全部改为 `<amp-img>`**，必填 width/height（可用 `context.containerWidth` 与推导高度）。不再输出 `<input type="radio">` 和 `<label for="...">`；每个 slide 为 `<amp-img>` 或 `<a><amp-img></a>`（若保留 href）。

## 涉及文件

- `packages/mjml-carousel/src/Carousel.js`
- `packages/mjml-carousel/src/CarouselImage.js`

## 潜在问题与不能解决的

- **缩略图与主图联动**：当前用 radio + CSS 把「点击缩略图 = 切换主图」做在一起；AMP carousel 是否有「缩略图控制主轮播」的官方用法需查文档，**可能无法完全复刻「点击缩略图切换」的交互**，或需用多段 amp-carousel 做近似。
- **Outlook 降级**：原 `renderFallback()` 对 Outlook 只展示第一张图；AMP 模式下不再输出 MSO 条件，**Outlook 下可能不显示 AMP 部分或显示策略由邮件客户端决定**，无法保证与原版一致。
- **左右箭头图**：若 AMP 不允许多个 amp-img 在 controls 区域，**箭头可能需用 CSS 或 AMP 内置控件**，视觉可能与当前自定义图标不一致。
