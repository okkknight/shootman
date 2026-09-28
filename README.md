# 功德篮球（Shootman）

一个单机像素风投篮网页小游戏。按住空格蓄力、松开投篮；触屏设备也可以使用页面上的蓄力按钮。进球后累计本次会话的「功德」，下一回合会重新生成投篮位置。

游戏使用 Phaser 3 和 TypeScript。画面中的像素纹理由代码绘制，仓库没有外部图片或音频素材，也没有后端、账号或数据库。

## 本地运行

需要 Node.js 和 npm：

```bash
npm ci
npm run dev
```

打开终端中显示的本地地址，默认是 `http://localhost:5173/`。

## 构建

```bash
npm run build
```

产物位于 `dist/`。如需部署在 `/shootman/` 子路径下，可使用 `npm run build:shootman`。

## 项目范围

这是一个轻量单机游戏原型。玩法和实现约束见 [设计方案](<./《功德篮球》MVP 游戏设计方案.md>)。

## 许可

项目代码采用 [MIT 许可证](LICENSE)。第三方依赖各自保留原许可证：Phaser 为 MIT，Press Start 2P 字体为 SIL Open Font License 1.1。对应许可证文本见 [`third_party/`](third_party/)。
