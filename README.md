# dsh-sidebar-manager

让 DSH 的扩展入口和视图标签支持**折叠、排序、隐藏**。

[![npm version](https://img.shields.io/npm/v/dsh-sidebar-manager?style=flat&label=npm)](https://www.npmjs.com/package/dsh-sidebar-manager) [![DSH](https://img.shields.io/badge/DSH-up%20to%200.2.1--rc.2-4D6BFE)](https://github.com/deepseek-ai/deepseek-harness) [![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE) [![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)

| 折叠 | 展开（隐藏 + 排序后） | 编辑 |
| --- | --- | --- |
| ![](https://raw.githubusercontent.com/zuojinxin/dsh-sidebar-manager/main/docs/screenshots/01-folded.png) | ![](https://raw.githubusercontent.com/zuojinxin/dsh-sidebar-manager/main/docs/screenshots/02-expanded.png) | ![](https://raw.githubusercontent.com/zuojinxin/dsh-sidebar-manager/main/docs/screenshots/03-editing.png) |

## 功能

- **折叠**：点标题行收起左侧整组扩展入口
- **隐藏**：点齿轮编辑，勾选要显示的侧栏扩展，以及会话顶部的视图标签
- **排序**：编辑模式下拖动调整顺序，侧栏上下拖，标签左右拖

设置自动保存，刷新后仍在。

## 安装

从 npm 安装：

```bash
dsh plugin --profile desktop add dsh-sidebar-manager
```

从 GitHub 安装：

```bash
dsh plugin --profile desktop add 'github:zuojinxin/dsh-sidebar-manager#v0.8.2'
```

装完重启 DSH 桌面版生效。

## 说明

- 面向 DeepSeek Harness 0.2.1-rc.2。插件靠宿主 CSS 类名定位，DSH 升级后可能需要适配。
- 「对话」标签不可隐藏（默认视图，藏掉中间会变空）；正在看的标签也不可隐藏。
- 禁用插件后，页面上由它添加的元素和样式会全部移除。

## 开发

```bash
npm install --no-save jsdom
node --test test/client.test.js
```

## 许可

[MIT](./LICENSE)，基于 [nico-zhuang/dsh-sidebar-nav-collapse](https://github.com/nico-zhuang/dsh-sidebar-nav-collapse) 重写。
