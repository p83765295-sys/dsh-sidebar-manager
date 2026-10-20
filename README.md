# dsh-sidebar-manager

[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-0.2.1--rc.2-2b6cf6)](https://github.com/deepseek-ai)
[![license](https://img.shields.io/badge/license-MIT-3da639)](./LICENSE)
[![tests](https://img.shields.io/badge/tests-50%20passing-3da639)](./test/client.test.js)

给 DeepSeek Harness 侧栏加一个**分组标题行**。点它能把这组扩展入口整个收起；标题右边的齿轮进入编辑模式，在那里勾选要显示哪些扩展和视图标签，也可以拖动调整它们的顺序。

插件装多了以后，侧栏会被挤成一长列。DSH 自带的「收起侧栏」是整个左栏一起隐藏，工作区和会话列表也跟着没了。这个插件只处理**扩展入口**这一组，其余部分一概不动。

> 本仓库是 [nico-zhuang/dsh-sidebar-nav-collapse](https://github.com/nico-zhuang/dsh-sidebar-nav-collapse) 的维护分支。在原作者 v0.1.0 的基础上重写了交互和视觉，让排版、配色、字号与 DSH 原生侧栏保持一致。

## 效果

<table>
<tr>
<td align="center"><img src="docs/screenshots/02-expanded.png" width="260" alt="展开态"><br><sub><b>展开</b>：标题行 + 全部扩展入口</sub></td>
<td align="center"><img src="docs/screenshots/01-folded.png" width="260" alt="折叠态"><br><sub><b>折叠</b>：入口收起，标题行保留</sub></td>
<td align="center"><img src="docs/screenshots/03-editing.png" width="260" alt="编辑态"><br><sub><b>编辑</b>：勾选框 + 拖拽手柄</sub></td>
</tr>
</table>

编辑态截图里，「任务看板」前面是空方框、文字变灰，其余几条都打着勾。因为它此刻是被隐藏的。

这里有个刻意的设计：被隐藏的条目只是变灰，不会从编辑列表里消失。否则你一勾掉它，它当场就不见了，再想勾回来根本找不到它在哪。等你退出编辑模式，它才会从侧栏里消失，下面的条目补上它原来的位置。

## 功能

- **折叠一组入口**：点击标题行收起或展开下方的扩展入口，刷新页面后状态仍在。
- **逐个显示/隐藏**：点齿轮进入编辑模式，每个扩展前面出现勾选框。取消勾选的条目在编辑模式里变灰而不是消失，方便随时改回来；退出编辑模式后它才真正不再显示。
- **视图标签同样可管**：主内容区顶部的视图标签（画廊、编队等）也能隐藏和排序，规则与侧栏一致。
- **拖拽排序**：编辑模式下按住左侧的拖拽手柄调整顺序。侧栏上下拖，标签左右拖。松手立即生效，没有「确定 / 取消」按钮。
- **键盘可达**：标题行本身是一个按钮，`Enter` 或空格键切换折叠，`Escape` 退出编辑模式。
- **卸载干净**：禁用插件后，页面上由它添加的元素和样式会全部移除。
- **跟随主题**：配色和字号取自宿主的设计变量，切换深色或浅色主题时自动跟随。

### 几条设计上的取舍

- **「对话」标签不能隐藏**：它是宿主的默认视图，藏掉之后中间区域会一片空白，所以固定常显。
- **正在看的视图不能隐藏**：如果你勾掉当前所在的标签，它会自己弹回并给出提示，避免页面突然变空。
- **编辑模式下不能折叠列表**：折叠会把勾选框一起藏起来，你就没法继续操作了。所以进入编辑模式时会自动展开，退出时再恢复成你原来的折叠状态。
- **没有「未保存」状态**：每次勾选和拖动都会立刻保存，不存在忘记保存的情况。`Escape` 只负责退出编辑模式，不会撤销已经做出的改动。

## 安装

```bash
# 从本仓库安装（锁定 tag，推荐）
dsh plugin --profile desktop add 'github:zuojinxin/dsh-sidebar-manager#v0.8.0'
```

安装后需要重启 DSH 桌面版才会生效。

插件没有安装脚本，也不引入任何运行时依赖，只需要宿主提供的 `@deepseek-ai/cordis`。

## 兼容性

- 面向 **DeepSeek Harness 0.2.1-rc.2** 开发和验证。
- 插件靠宿主 DOM 里的 `panelList`、`panelRow` 这些 CSS Module 类名片段，以及 `aria-label` 为「全局面板」或「Global panels」的容器来定位。**DSH 升级后可能需要跟着适配**，所有非官方 UI 插件都有这个风险。
- 只改动「全局面板」这一组导航，其他导航区域不受影响。

## 数据存储

所有设置都存在浏览器的 `localStorage` 里，共用一个键 `dsh-sidebar-nav-collapse:state`：

```json
{
  "v": 2,
  "folded": false,
  "hidden": ["任务看板"],
  "views": ["上下页"],
  "order": ["插件", "自动化任务", "上下文洞察"],
  "orderViews": ["对话", "画廊", "编队"]
}
```

| 字段 | 含义 |
| --- | --- |
| `v` | 记录格式版本，当前是 2 |
| `folded` | 列表是否折叠 |
| `hidden` | 被隐藏的侧栏扩展名称 |
| `views` | 被隐藏的视图标签名称 |
| `order` | 侧栏扩展的排列顺序 |
| `orderViews` | 视图标签的排列顺序 |

- 键名里的 `sidebar-nav-collapse` 是插件原来的名字。后来包改名为 `dsh-sidebar-manager`，这几个键**故意没有跟着改**——一旦改了，所有人已经存好的设置都会凭空消失，而这个前缀只是内部标识，界面上根本看不到。
- 早期版本把设置拆在 `:folded`、`:hidden`、`:views` 三个键里，第一次启动时会自动合并过来。
- 如果记录里的版本号比当前插件新，插件会忽略它而不是强行读取；记录损坏也不会让侧栏崩溃，只是回到默认状态。

## 开发

```bash
# 运行测试（50 条，基于 jsdom）
npm install --no-save jsdom
node --test test/client.test.js
```

如果 jsdom 装在别处，可以用 `SNC_JSDOM` 环境变量指向它的入口文件。

源码结构：

| 文件 | 作用 |
| --- | --- |
| `lib/index.js` | 宿主侧入口，只做插件声明 |
| `lib/client.js` | 全部实现：注入样式、包裹侧栏结构、读写设置、拖拽排序 |
| `cordis.patch.yml` | 把插件挂进宿主 bundle |

`lib/client.js` 里的 CSS 是一整段模板字符串常量，改样式后注意大括号要配平，否则整段样式会失效。

## 许可

[MIT](./LICENSE)

原项目由 [nico-zhuang](https://github.com/nico-zhuang) 创建。
