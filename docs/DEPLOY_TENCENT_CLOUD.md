# 腾讯云部署与更新记录

本文记录智答课堂在腾讯云服务器上的部署方式。服务器当前使用宝塔面板管理 Nginx、SSL 和 Node 项目。

## 当前服务器

- 操作系统：OpenCloudOS 9
- 服务器 IP：`124.221.117.114`
- 域名：`zhida.foun.fun`
- 项目目录：`/www/wwwroot/zhidaroom`
- Node 路径：`/www/server/nodejs/v22.22.3/bin`
- API 端口：`3001`
- API 进程：宝塔 Node 项目 `api_server`

## 访问地址

- 大屏端：`https://zhida.foun.fun/screen/`
- 教师后台：`https://zhida.foun.fun/teacher/`
- 手机扫码端：`https://zhida.foun.fun/scanner/`
- API 健康检查：`https://zhida.foun.fun/api/health`

根地址 `https://zhida.foun.fun/` 会跳转到 `/screen/`。

## 服务器专属文件

以下文件只存在服务器，不进入 GitHub：

- `/www/wwwroot/zhidaroom/services/api-server/.env`
- `/www/wwwroot/zhidaroom/data/zhida.dev.db`
- `/www/server/panel/vhost/nginx/zhida.foun.fun.conf`
- SSL 证书文件
- 宝塔 Node 项目配置

这些文件不会被 `git pull` 覆盖。更新代码前，仍建议备份 SQLite 数据库。

## Nginx 路由

宝塔站点 `zhida.foun.fun` 的 Nginx 配置保留 SSL 证书段，并加入以下业务路由：

```text
/          -> /screen/
/screen/   -> apps/web-screen/dist
/teacher/  -> apps/web-teacher/dist
/scanner/  -> apps/mobile-scanner/dist
/api/      -> http://127.0.0.1:3001
```

如果以后在宝塔面板重新保存站点配置，可能会覆盖这些路由。覆盖后需要把上述路由重新合并回站点配置。

## 常规更新流程

本地开发完成后：

```bash
git add .
git commit -m "说明本次修改"
git push
```

然后登录服务器执行：

```bash
cd /www/wwwroot/zhidaroom
./scripts/deploy/server-update.sh
```

脚本会执行：

1. 备份 `data/zhida.dev.db`
2. `git pull --ff-only`
3. 安装 API、教师端、大屏端、扫码端依赖
4. 构建 API 和三个前端
5. 尝试重启 PM2 项目 `api_server`

如果脚本提示找不到 PM2 项目，就到宝塔 Node 项目里手动重启 `api_server`。

## 手动构建命令

如果需要分步排查，可以在服务器执行：

```bash
export PATH=/www/server/nodejs/v22.22.3/bin:$PATH
cd /www/wwwroot/zhidaroom

./scripts/api/install.sh
./scripts/web/teacher-install.sh
./scripts/web/screen-install.sh
./scripts/mobile/scanner-install.sh

./scripts/api/build.sh
./scripts/web/teacher-build.sh
./scripts/web/screen-build.sh
./scripts/mobile/scanner-build.sh
```

前端构建完成后 Nginx 不需要重启。API 构建完成后需要在宝塔 Node 项目里重启 `api_server`，或通过 PM2 重启。

## 验证清单

每次更新后检查：

```bash
curl https://zhida.foun.fun/api/health
```

浏览器检查：

- `https://zhida.foun.fun/screen/`
- `https://zhida.foun.fun/teacher/`
- `https://zhida.foun.fun/scanner/`

真实课堂测试还要确认：

- 大屏登录成功
- 手机微信扫码进入扫码端
- 手机摄像头可打开
- 创建课堂后大屏能自动绑定
- 扫码采集答案能进入统计页

## 安全提醒

- 不要把 `.env`、SQLite 数据库、日志提交到 GitHub。
- 服务器 root 密码已经在部署沟通过程中使用过，建议部署稳定后及时更换。
- SQLite 数据库需要定期备份，当前更新脚本会在每次更新前生成本地备份。
