# Focess Minecraft tools

同一站点介绍并连接两款工具。整合包搜索使用 FocessAPI；FactoryCanvas 在浏览器中读取 JSON 并计算产线。

- `/`：工具首页。
- `/modpacks/`：整合包搜索；结果使用哈希路由。
- `/factory/`：FactoryCanvas 介绍、使用方式和网页入口。

## 开发与构建

使用 Node.js 22+ 和仓库指定的 pnpm 7.33.7：

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
```

`dist/` 是可部署的完整静态站点。GitHub Actions 检查搜索请求与选择行为、执行生产构建，通过后提供 `site.zip`。将压缩包内容作为站点根目录部署，保留子目录结构；搜索使用哈希路由，无需额外路径回退。本站不再提供 `/new`。

搜索调用 `VITE_BASE_URL` 指定的 FocessAPI，默认 `https://api.focess.top`。reCAPTCHA 保留现有站点配置，域名必须被该站点配置允许；网络或验证服务不可用时显示可重试错误，不伪造搜索结果。

将 FactoryCanvas 的 `factorycanvas-static.zip` 解压到站点根目录下的 `factory/app/`，即可从介绍页打开规划器。其资源使用相对地址，不需要 Java 运行服务、上传接口或计算服务器。部署应保留目录结构并提供 `.wasm` 文件；不要将不存在的资源回退成 HTML。可将整合包 JSON 放在该目录下的 `packs/`，用 `/factory/app/?pack=packs/name.json` 打开。

门户源码不复制另一仓库的构建产物；部署时组合这两个静态产物。本站不捆绑整合包、方案或本地游戏文件。

搜索 UI 基于 daidr 的 MinecraftModpackHub，保留作者标记。草地、矿物与工具素材来自 Kenney Voxel Pack（CC0）；像素字体使用 Fusion Pixel Font（OFL-1.1）。本站立方体标记和界面边框独立绘制，素材来源与原始许可证随站点发布，见 `public/credits.txt`。未捆绑 Minecraft 原版贴图或标志。
