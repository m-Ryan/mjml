# Block: mjml-body 与 mj-head 相关

## 怎么转换

- **mjml-body**（`packages/mjml-body/src/index.js`）：
  - 当前输出 `<body>` + 内层 `<div>`（含 `aria-label`、`aria-roledescription="email"`、`role="article"`、lang、dir、style），以及 `buildPreview(preview)` 和 `renderChildren()`。
  - AMP 允许 `<body>` 和常规 div/表格/内联样式；**无需改标签名**，仅需确保不输出 AMP 禁止的属性或标签（如内联 script、某些 event 属性）。preview 若为注释或隐藏 div，一般可保留。
  - **可保持不变**，仅在做 AMP 校验后按报错收敛（若有）。

- **mj-head 相关**（HeadAttributes、HeadBreakpoint、HeadFont、HeadPreview、HeadStyle、HeadTitle 等）：
  - 当前各组件通过 `headHelpers.add()` 往 `globalData` 写入 title、preview、headRaw、fonts、breakpoint、headStyle、style 等；最终在 **skeleton** 里输出多个 `<meta>`、`<style>`、`<link>` 等。
  - **改为 AMP 专用**：不在 skeleton 里输出多份 `<style>`，而是由 **index.js** 在调用 skeleton 前，把 `headStyle`、`componentsHeadStyle`、`style`、mediaQueries、fonts 等**合并成一段 CSS**（及保留 headRaw 中允许的标签）；skeleton 只输出 **一个 `<style amp-custom>`** 和 AMP 规定的 meta/script/boilerplate。**Title** 仍可放在 `<head>`；**preview** 若为 meta 或注释可保留；**fonts** 需符合 AMP 字体规则（见 01-core-skeleton）。
  - **HeadBreakpoint** 产生的 media query 会并入 amp-custom；AMP 对 `@media` 有限制，需在合并或过滤时处理。

## 涉及文件

- `packages/mjml-body/src/index.js`（可选微调）
- `packages/mjml-head/src/index.js`（若存在）
- `packages/mjml-head-*` 各包：不直接改输出标签，而是依赖「head 合并进 amp-custom」在 core 中统一处理。
- `packages/mjml-core/src/index.js`（合并逻辑、传入 skeleton 的参数）

## 潜在问题与不能解决的

- **Preview 文本**：部分客户端用 `<meta>` 或隐藏 div 做预览；AMP 对 meta 和 body 内隐藏内容可能有限制，**若校验不通过需调整或移除**。
- **Breakpoint 与 media query**：AMP 只允许部分 media 条件，**复杂的多断点或 OWA/Thunderbird 专用 media 可能无法全部保留**。
- **Head 中非 CSS 的 headRaw**：若用户注入自定义 `<link>` 或 `<script>`，AMP 禁止多数 script 和部分 link，**需文档说明「headRaw 在 AMP 下可能被忽略或导致校验失败」**。
