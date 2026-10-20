# dsh-sidebar-manager

让 DSH 的扩展入口和视图标签支持**折叠、排序、隐藏**。

<table>
<tr>
<td align="center"><img src="docs/screenshots/02-expanded.png" width="240" alt="展开态"><br><sub>展开</sub></td>
<td align="center"><img src="docs/screenshots/01-folded.png" width="240" alt="折叠态"><br><sub>折叠</sub></td>
<td align="center"><img src="docs/screenshots/03-editing.png" width="240" alt="编辑态"><br><sub>编辑</sub></td>
</tr>
</table>

图 1 展开、图 2 折叠、图 3 编辑。

## 功能

- **折叠**：点标题行收起左侧整组扩展入口
- **隐藏**：点齿轮编辑，勾选要显示的侧栏扩展，以及会话顶部的视图标签
- **排序**：编辑模式下拖动调整顺序，侧栏上下拖，标签左右拖

设置自动保存，刷新后仍在。

## 安装

```bash
dsh plugin --profile desktop add 'github:zuojinxin/dsh-sidebar-manager#v0.8.0'
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
