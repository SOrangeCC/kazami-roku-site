# 風見ロク（风见陆陆）个人网站 V1

面向 **銀潮project** 所属虚拟主播 **風見ロク（风见陆陆）** 的个人主页、点歌单、歌切播放器、直播周表、二创聚合与直播数据汇总站。

## 技术栈

- **框架**：Next.js 15 (App Router, `output: "standalone"`) + TypeScript + Tailwind CSS
- **数据库**：Drizzle ORM + SQLite (`better-sqlite3`, WAL 模式)
- **状态管理**：Zustand（全局歌切播放器状态）
- **部署**：Azure Arm64 Linux VM (`Standard B2pts v2`) + Docker Compose + Cloudflare Tunnel（无需暴露宿主机 80/443/3000 端口）

## 本地开发

1. 复制环境变量文件并按需修改：
   ```bash
   cp .env.example .env
   ```
2. 安装依赖并初始化数据库：
   ```bash
   npm install
   npm run db:migrate
   ```
3. 运行数据同步脚本（`sync:songs` 在上游不可达时会自动回退到 `scripts/seed-songs.json`）：
   ```bash
   npm run sync:songs
   npm run sync:live
   npm run sync:schedule
   npm run sync:stats
   npm run sync:creations
   ```
4. 启动开发服务器：
   ```bash
   npm run dev
   ```
5. 将主播冬季水手服立绘放置于 `public/images/portrait-winter.jpg`。

## 管理接口与歌切上传示例（curl）

所有 `/api/admin/*` 接口均需携带请求头：`Authorization: Bearer <ADMIN_TOKEN>`。

### 1. 为歌曲绑定歌切（外链音频 / R2 / B 站 BV 号）

```bash
curl -X POST http://localhost:3000/api/admin/songs/1/clips \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "audio_url",
    "title": "2026-11-18 冬季歌回版",
    "audio_url": "https://cdn.example.com/clips/song-001.mp3",
    "sung_at": "2026-11-18",
    "is_primary": true
  }'
```

### 2. 删除歌切

```bash
curl -X DELETE http://localhost:3000/api/admin/clips/1 \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### 3. 获取 Cloudflare R2 音频直传预签名 URL

```bash
curl -X POST http://localhost:3000/api/admin/uploads/presign \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "clip.mp3",
    "contentType": "audio/mpeg",
    "songId": 1
  }'
```

> 若未配置 `R2_*` 环境变量，该接口返回 `501 Not Configured`，不影响网站其余功能运行。

### 4. 手动覆盖本周周表 / 录入二创

```bash
curl -X POST http://localhost:3000/api/admin/schedule \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "week_label": "2026-W48",
    "caption": "本周直播安排",
    "image_url": "https://example.com/schedule.jpg",
    "is_manual_override": true
  }'
```

## Azure 云服务器部署步骤（Cloudflare Tunnel）

适用于已运行 `3x-ui` 占用 `80`/`443` 端口的 Azure Arm64 VPS（如 `Standard B2pts v2`，1 GiB RAM）：

1. **创建 2 GB Swap（1 GiB RAM 机型构建镜像前必做）**：
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
2. **配置 Cloudflare Tunnel**：
   - 在 Cloudflare Zero Trust Dashboard 创建 Tunnel，添加 Public Hostname，将服务类型设为 `HTTP`，目标 URL 填写 `app:3000`（容器内网通信，无需在宿主机开放 `80`/`443`/`3000` 端口）。
   - 复制生成的 Tunnel Token。
3. **上传代码并配置环境变量**：
   - 将项目部署到 `/opt/kazami-roku-site`
   - 复制 `.env.example` 为 `.env`，填入强随机 `ADMIN_TOKEN` 与 `TUNNEL_TOKEN`
4. **启动容器与初始化数据库**（使用 GitHub Actions 预构建的 `linux/arm64` 镜像，无需在 1 GiB RAM 服务器本地编译）：
   ```bash
   docker compose pull app
   docker compose up -d
   docker compose exec -T app npm run db:migrate
   docker compose exec -T app npm run sync:songs
   ```
   后续代码更新只需在 GitHub 推送 `main` 分支触发镜像构建后，在服务器执行零构建更新命令：
   ```bash
   docker compose pull app && docker compose up -d --no-deps app
   ```
5. **配置宿主机定时任务**：参考 `deploy/crontab.example` 写入 `crontab -e`。

## Cloudflare CDN 与 R2 流量优化

- **CDN 边缘缓存**：建议将域名接入 Cloudflare 并开启代理（橙云），对 `/_next/static/*`、`/images/*`、`/api/media/*` 配置缓存规则以降低 Azure 出站带宽消耗。
- **R2 音频外置**：批量上传歌切音频时配置 `.env` 中的 `R2_ACCOUNT_ID`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`、`R2_PUBLIC_URL`，即可通过预签名 URL 直传 Cloudflare R2，免除出站流量费。
