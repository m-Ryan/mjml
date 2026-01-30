# Block: mjml-image

## 怎么转换

- **当前**：`packages/mjml-image/src/index.js` 中 `renderImage()` 输出普通 `<img>`，属性含 `alt`、`src`、`srcset`、`sizes`、`style`、`title`、`width`、可选 `height`、`usemap`；若存在 `href` 则用 `<a>` 包裹。外层是 table/td 布局。`headStyle` 产出 `mj-full-width-mobile` 的 media query。
- **改为 AMP 专用**：
  1. `renderImage()` 改为输出 `<amp-img>`，不再输出 `<img>`。
  2. AMP 要求 `amp-img` 必须提供 **width** 和 **height**（数值，不能仅 `auto`）。当前 MJML 支持 `height="auto"` 或省略 height，需在 AMP 分支中：若未提供 height 或为 `auto`，用默认高度（如与 width 同值或固定 1）或从容器宽度推导，并在文档中说明。
  3. 属性映射：`src`、`alt`、`title` 保留；`width`/`height` 用数值；可加 `layout="responsive"` 或 `intrinsic` 以适配 AMP；`srcset`/`sizes` 若 AMP 支持则保留，否则省略。
  4. 若有 `href`，继续用 `<a>` 包裹 `<amp-img>`（AMP Email 允许）。
  5. 移除或不再依赖与 `fluid-on-mobile` 相关的 `headStyle`（若该样式进入 amp-custom 且不违规则可保留，否则删除）。
  6. table/td 外层布局可保留（AMP 允许表格），仅内部 img → amp-img。

## 涉及文件

- `packages/mjml-image/src/index.js`（`renderImage()` 及可选 `headStyle`）

## 潜在问题与不能解决的

- **height 必填**：MJML 中大量使用 `height="auto"` 或未设 height，AMP 不允许。用默认/推导值会改变版式或比例，**无法在「不设高度」场景下与原版视觉完全一致**。
- **usemap**：AMP 的 `amp-img` 对 image map 支持不同，若 MJML 使用 `usemap`，**可能无法在 AMP 中等价实现**，需标注或放弃该属性。
- **srcset/sizes**：需确认 AMP for Email 是否支持 `amp-img` 的 srcset；若不支持，只能输出单一 `src`，**响应式图集可能退化**。
