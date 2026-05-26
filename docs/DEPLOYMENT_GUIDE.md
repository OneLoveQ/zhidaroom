# 智答课堂 AI 部署说明

## 一、部署目标

本文说明“智答课堂 AI”在云服务器上的正式部署方式。系统部署后，对外提供教师管理端、课堂大屏端、教师手机扫码端、平台后台和后端 API 服务。

正式访问地址建议统一使用 HTTPS 域名：

- 课堂大屏端：`https://zhida.foun.fun/screen/`
- 教师管理端：`https://zhida.foun.fun/teacher/`
- 教师手机扫码端：`https://zhida.foun.fun/scanner/`
- 平台后台：`https://zhida.foun.fun/admin/`
- API 健康检查：`https://zhida.foun.fun/api/health`

正式环境不得使用 `localhost`、局域网 IP、`cpolar` 等临时调试地址作为扫码端公开地址。

## 二、系统组成

项目采用前后端分离部署：

| 模块 | 目录 | 说明 |
| --- | --- | --- |
| 后端 API | `services/api-server` | 提供账号、班级、题库、课堂、扫码上传、报告和 AI 诊断接口 |
| 教师管理端 | `apps/web-teacher` | 教师维护班级、学生、题库和下载答题码 |
| 课堂大屏端 | `apps/web-screen` | 教室电脑或一体机打开，用于扫码绑定、实时统计和复盘 |
| 手机扫码端 | `apps/mobile-scanner` | 教师手机扫码进入，用于创建课堂和采集答题卡 |
| 平台后台 | `apps/admin-console` | 管理员查看平台基础数据 |

运行时建议使用 Nginx 统一承载静态前端，并将 `/api/` 反向代理到后端 API。

## 三、服务器环境

推荐服务器环境如下：

- Linux 服务器，已开放 `80` 和 `443` 端口。
- 已安装 Node.js 22 或兼容版本。
- 已安装 Git。
- 已配置 Nginx。
- 已配置 HTTPS 证书。
- 项目目录：`/www/wwwroot/zhidaroom`
- API 运行端口：`3001`
- 数据库：SQLite，默认文件为 `data/zhida.dev.db`

服务器需要保留以下目录：

```text
/www/wwwroot/zhidaroom
├── apps/
├── services/
├── scripts/
├── data/
└── logs/
```

其中 `data/` 用于保存数据库和备份文件，`logs/` 用于保存运行日志。

## 四、代码获取

首次部署时，在服务器项目目录拉取代码：

```bash
cd /www/wwwroot
git clone <项目 Git 地址> zhidaroom
cd /www/wwwroot/zhidaroom
```

如果服务器已经存在项目目录，后续更新使用：

```bash
cd /www/wwwroot/zhidaroom
git pull --ff-only
```

正式部署前，应确认服务器代码分支与 GitHub 主分支一致。

## 五、环境变量配置

后端 API 的环境变量文件位于：

```text
services/api-server/.env
```

可参考 `services/api-server/.env.example` 创建。正式环境至少需要配置：

```text
API_PORT=3001
DATABASE_URL="file:../../../data/zhida.dev.db"
SCANNER_PUBLIC_BASE_URL="https://zhida.foun.fun/scanner"
MIMO_API_URL="https://token-plan-cn.xiaomimimo.com/v1/chat/completions"
MIMO_API_KEY=""
MIMO_MODEL="mimo-v2.5"
MIMO_ALLOW_INSECURE_TLS="false"
```

说明：

- `API_PORT` 是后端 API 监听端口。
- `DATABASE_URL` 指向 SQLite 数据库文件。
- `SCANNER_PUBLIC_BASE_URL` 是大屏二维码生成手机扫码地址时使用的公开地址，正式环境必须是 `https://zhida.foun.fun/scanner`。
- `MIMO_API_KEY` 用于 AI 诊断能力，应只保存在服务器环境变量文件中，不得提交到 GitHub。

## 六、安装依赖与构建

项目要求通过 `scripts/` 目录下的脚本进行部署操作。不要直接在部署流程中手动执行零散的 `npm` 命令。

在服务器执行：

```bash
cd /www/wwwroot/zhidaroom

./scripts/api/install.sh
./scripts/web/teacher-install.sh
./scripts/web/screen-install.sh
./scripts/mobile/scanner-install.sh
./scripts/admin-console/run.sh install

./scripts/api/build.sh
./scripts/web/teacher-build.sh
./scripts/web/screen-build.sh
./scripts/mobile/scanner-build.sh
./scripts/admin-console/run.sh build
```

构建产物位置：

| 模块 | 构建产物 |
| --- | --- |
| 教师管理端 | `apps/web-teacher/dist` |
| 课堂大屏端 | `apps/web-screen/dist` |
| 手机扫码端 | `apps/mobile-scanner/dist` |
| 平台后台 | `apps/admin-console/dist` |
| 后端 API | `services/api-server/dist` |

## 七、Nginx 配置

Nginx 需要把不同路径转发到对应前端目录或 API 服务：

```text
/          -> /screen/
/screen/   -> apps/web-screen/dist
/teacher/  -> apps/web-teacher/dist
/scanner/  -> apps/mobile-scanner/dist
/admin/    -> apps/admin-console/dist
/api/      -> http://127.0.0.1:3001
```

配置重点：

1. 根路径 `/` 建议跳转到 `/screen/`。
2. 前端路径需要支持 SPA 回退到对应 `index.html`。
3. `/api/` 必须反向代理到本机 `3001` 端口。
4. HTTPS 证书应绑定正式域名 `zhida.foun.fun`。
5. 修改 Nginx 配置后需要重新加载 Nginx。

## 八、启动后端服务

后端 API 启动脚本为：

```bash
cd /www/wwwroot/zhidaroom
./scripts/api/start.sh
```

生产环境建议使用宝塔 Node 项目、PM2 或 systemd 托管该脚本，确保服务器重启后 API 能自动恢复。

当前腾讯云部署中，API 由宝塔 Node 项目托管。更新代码后，如脚本未能自动重启 API，可在宝塔面板中手动重启对应 Node 项目。

## 九、一键更新流程

服务器已经维护了一键更新脚本：

```bash
cd /www/wwwroot/zhidaroom
./scripts/deploy/server-update.sh
```

该脚本会自动执行：

1. 备份 SQLite 数据库到 `data/backups/`。
2. 拉取 Git 最新代码。
3. 安装后端和各前端依赖。
4. 构建后端和各前端。
5. 尝试重启 API 服务。

日常上线推荐使用该脚本，避免漏掉某个前端或后端模块。

也可以从本地电脑远程触发：

```bash
ssh zhidaroom-cloud "cd /www/wwwroot/zhidaroom && ./scripts/deploy/server-update.sh"
```

## 十、上线验证

部署完成后，先验证 API：

```bash
curl https://zhida.foun.fun/api/health
```

浏览器逐项检查：

- `https://zhida.foun.fun/screen/`
- `https://zhida.foun.fun/teacher/`
- `https://zhida.foun.fun/scanner/`
- `https://zhida.foun.fun/admin/`

课堂流程验证：

1. 打开课堂大屏端并登录。
2. 确认大屏显示正式域名扫码地址。
3. 用手机扫码进入 `https://zhida.foun.fun/scanner/`。
4. 手机端选择班级和题目，创建课堂。
5. 大屏自动绑定并进入课堂状态。
6. 手机端开启摄像头采集答题码。
7. 大屏实时显示已答人数、未答人数和选项统计。
8. 结束采集后查看课堂报告和 AI 诊断。

如果二维码中出现 `cpolar`、`localhost` 或本地 IP，说明 `SCANNER_PUBLIC_BASE_URL` 配置错误，需要修正服务器 `.env` 后重启 API。

## 十一、数据备份与回滚

SQLite 数据库文件建议定期备份：

```bash
cd /www/wwwroot/zhidaroom
mkdir -p data/backups
cp data/zhida.dev.db "data/backups/zhida.dev.$(date +%Y%m%d%H%M%S).db"
```

代码回滚可使用 Git 切换到上一稳定提交后重新构建：

```bash
cd /www/wwwroot/zhidaroom
git log --oneline -5
git checkout <稳定提交哈希>
./scripts/deploy/server-update.sh
```

如需恢复数据库，应先停止 API 服务，再将备份数据库复制回 `data/zhida.dev.db`，最后重启 API。

## 十二、安全要求

1. 不得将 `.env`、数据库文件、日志文件和 SSL 证书提交到 GitHub。
2. AI 接口密钥、服务器密码、SSH 私钥只允许保存在服务器或个人安全环境中。
3. 正式环境必须使用 HTTPS。
4. 宝塔面板、服务器 SSH 和管理员账号应设置强密码。
5. 部署完成后，应保留至少一份数据库备份。
6. 更新前应确认本地代码已提交并推送，服务器只从 GitHub 拉取正式版本。

## 十三、常见问题

### 13.1 手机扫码进入的是测试地址

检查服务器 `services/api-server/.env`：

```text
SCANNER_PUBLIC_BASE_URL="https://zhida.foun.fun/scanner"
```

修改后重启 API，再刷新大屏重新生成二维码。

### 13.2 前端页面打开空白

处理方法：

1. 检查对应前端是否已构建出 `dist/`。
2. 检查 Nginx 路径是否指向正确目录。
3. 检查 SPA 回退配置是否正确。
4. 打开浏览器开发者工具查看静态资源是否 404。

### 13.3 API 健康检查失败

处理方法：

1. 确认 API 进程已启动。
2. 确认 `API_PORT=3001`。
3. 检查 Nginx `/api/` 反向代理配置。
4. 查看服务器 `logs/` 或宝塔 Node 项目日志。

### 13.4 手机端看不到班级或题目

处理方法：

1. 确认教师端已有班级、学生和题目数据。
2. 确认手机端扫码地址来自当前大屏。
3. 确认正式域名和 API 指向同一套服务器数据。
4. 清理手机浏览器缓存后重新扫码。
