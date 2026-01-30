# Block: mjml-social（SocialElement）

## 怎么转换

- **当前**：`packages/mjml-social/src/SocialElement.js` 中图标用 **`<img>`** 输出，属性含 `alt`、`title`、`src`、`style`、`width`（来自 iconSize）、`sizes`、`srcset`；可选外链 `<a>` 包裹。同一行可能还有文字（makeContent）。
- **改为 AMP 专用**：
  1. 将图标处的 **`<img>` 改为 `<amp-img>`**。
  2. **width** 已有（`parseInt(iconSize, 10)`）；**height** 必填，若当前未设则用与 width 同值或固定值（如 24），并在文档说明。
  3. 保留外链 `<a>`（AMP 允许）；`src`、`alt`、`title` 保留；若 AMP 对 `srcset`/`sizes` 在 amp-img 上支持有限，可只保留 `src`。
  4. 其余布局（table/td、文字列）不变，仅替换 img 标签。

## 涉及文件

- `packages/mjml-social/src/SocialElement.js`

## 潜在问题与不能解决的

- **图标尺寸**：社交图标多为方形，用 width=height 可接受；若设计为非方形，**需统一给 height 规则**，可能与原版像素不一致。
- **srcset/sizes**：若 AMP for Email 的 amp-img 不支持或限制 srcset，**高 DPI 图标可能只有单倍图**，在高分屏上略糊。
- **多图标 + 文字混排**：布局和样式若依赖复杂选择器，合并进 amp-custom 后可能受 AMP CSS 限制，**版式需实测**。
