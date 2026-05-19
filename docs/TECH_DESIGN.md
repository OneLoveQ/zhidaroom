# 智答课堂 AI MVP 技术设计

## 1. 技术目标

MVP 技术目标是用最小工程规模跑通课堂闭环，同时为后续移动扫码、AI 服务拆分、私有化部署预留清晰边界。

## 2. 推荐技术栈

| 层级 | 技术 |
| --- | --- |
| Monorepo | pnpm workspace 或 npm workspace，后续按实际脚手架确定 |
| 后端 | NestJS + TypeScript |
| 数据库 | PostgreSQL |
| ORM | Prisma |
| 教师 Web 端 | Vue 3 + TypeScript + Vite |
| 课堂大屏端 | Vue 3 + TypeScript + Vite |
| 图表 | ECharts |
| 实时通信 | WebSocket，必要时补 SSE |
| AI 模块 | 后端内置 AI 模块，后续拆分为 ai-service |
| 移动端 | 第二阶段使用 Flutter + OpenCV |

## 2.1 扫码产品形态决策

正式课堂扫码使用教师手机 App，不使用教师 Web 端网页摄像头作为正式扫码入口。

分工如下：

- 教师 Web 端：备课、班级管理、创建课堂活动、查看报告。
- 课堂大屏 Web：投影展示题目、匿名统计和讲评建议。
- 教师手机 App：选择课堂活动、打开摄像头、识别纸卡、离线缓存、批量上传。
- 扫码调试 Web：仅用于开发阶段验证卡片版式、识别算法和上传 payload。

原因：

- 手机 App 更适合课堂走动扫码、连续取帧、相机对焦和曝光控制。
- App 更适合接 OpenCV 或原生相机能力。
- App 可以做弱网离线缓存和恢复上传。
- 网页摄像头受浏览器权限、HTTPS 和机型兼容影响较大，不作为正式课堂方案。

## 3. 目录结构

```text
apps/
  web-teacher/
  web-screen/
  mobile-teacher/
  admin-console/
services/
  api-server/
  ai-service/
  realtime-service/
  cv-service/
packages/
  shared-types/
  ui-components/
  api-client/
docs/
discuss/
scripts/
logs/
deploy/
tests/
```

## 4. 模块边界

### 4.1 api-server

负责核心业务：

- 用户认证。
- 学校、班级、学生。
- 答题卡绑定。
- 题库。
- 课堂活动。
- 答题记录。
- 统计报告。
- AI 调用编排。
- 审计日志。

### 4.2 realtime-service

MVP 可先内置在 api-server 中。

职责：

- 推送活动状态。
- 推送答题进度。
- 推送选项统计。

### 4.3 ai-service

MVP 可先内置在 api-server 中。

职责：

- AI 题目生成。
- AI 错因分析。
- AI 讲评建议。
- AI 生成记录。
- 输出结构校验。

### 4.4 cv-service

第二阶段实现。

职责：

- ArUco 卡片识别。
- 卡片方向识别。
- 多帧确认。
- 离线缓存上传协议。

## 5. 数据流

```text
教师 Web 端创建活动
  -> api-server 保存活动
  -> 课堂大屏订阅活动状态
  -> 扫码端提交答题结果
  -> api-server 写入 answers
  -> realtime-service 推送统计
  -> 大屏更新匿名分布
  -> 教师结束活动
  -> api-server 生成报告
  -> ai-service 生成讲评建议
```

## 6. 工程约束

- TypeScript 禁止使用 CommonJS。
- 尽可能避免 `any`，确需使用必须先说明原因。
- 控制单文件规模，动态语言文件尽量不超过 300 行。
- 每层目录文件尽量不超过 8 个，超过时拆分子目录。
- 所有运行、测试、构建操作必须通过 `scripts/` 下的 `.sh` 脚本执行。
- 日志统一输出到 `logs/`。
