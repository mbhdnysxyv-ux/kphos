# macOS 26 Web UI (Open Source)

一个面向浏览器的 macOS 26 风格系统 UI 复刻项目。当前版本先提供高保真桌面基础层和核心交互骨架，后续可持续扩展到完整系统体验。

## 当前已实现

- 桌面壁纸与玻璃拟态视觉层
- Menu Bar（左侧 App 菜单 + 右侧状态区）
- Dock（悬停放大、激活指示、应用切换）
- 窗口系统基础样式（标题栏、红黄绿按钮、工具区）
- Control Center 浮层
- Notification Center 浮层
- 多个系统 App 占位（Finder / Safari / Notes / Settings）

## 快速启动

```bash
npm install
npm run dev
```

默认访问地址：

```text
http://localhost:5173
```

## 架构说明

- `src/main.js`: 全局状态、事件绑定、系统 UI 渲染
- `src/components/app-registry.js`: 应用注册表（图标、标题、内容模板）
- `src/styles/system.css`: 全局系统视觉规范（玻璃层、窗口、Dock、浮层）

## 下一阶段（建议优先级）

1. 引入窗口管理器（拖拽、缩放、层级、最小化）
2. 完整 Finder 信息架构（侧边栏、网格/列表、预览）
3. Launchpad + Mission Control + Spaces
4. 菜单系统行为复刻（快捷键、禁用态、上下文菜单）
5. 深色/浅色模式与系统动态色板
6. 无障碍语义和键盘导航
7. 像素级参数校准（间距、圆角、阴影、模糊半径）

## 说明

本项目用于学习与 UI 工程实践，不包含 Apple 私有资源。请在开源发布时补充品牌与知识产权相关声明。
