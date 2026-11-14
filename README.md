# Focess Minecraft tools

同一站点介绍并连接两款工具。整合包搜索使用 FocessAPI；FactoryCanvas 在浏览器中读取 JSON 并计算产线。

- `/`：工具首页。
- `/modpacks/`：整合包搜索；结果使用哈希路由。
- `/factory/`：直接打开 FactoryCanvas 规划器，无介绍页或跳转脚本。

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

搜索使用 v2 网站接口查询 CurseForge 与 Modrinth，部署前需要先准备匹配的 API 版本及双来源数据库迁移。前端仅发送访客的新验证码，不配置业务 API 密钥。已选模组按来源分别保留，原有 CurseForge 选择和旧书签仍可读取；结果按服务端排序与行偏移分页，不将一页结果当作总数。

跨域部署时，API 响应需要通过 `Access-Control-Expose-Headers` 暴露 `Retry-After`，前端才能读取并遵守服务端的限流等待时间。

将 FactoryCanvas 的 `factorycanvas-static.zip` 解压到站点根目录下的 `factory/`，即可从首页直接打开规划器。其资源使用相对地址，不需要 Java 运行服务、上传接口或计算服务器。部署应保留目录结构并提供 `.wasm` 文件；不要将不存在的资源回退成 HTML。可将整合包 JSON 放在该目录下的 `packs/`，用 `/factory/?pack=packs/name.json` 打开。

门户源码不复制另一仓库的构建产物；部署时组合这两个静态产物。本站不捆绑整合包、方案或本地游戏文件。

搜索 UI 基于 [daidr 的 MinecraftModpackHub](https://github.com/daidr/MinecraftModpackHub)。整合包图标和名称来自搜索数据源，归各自作者所有。

基础控件使用 FactoryCanvas 的 `@focess/minecraft-ui` 导出版本，位于 `src/vendor/minecraft-ui/`。该目录由源包的导出命令生成；更新主题时修改源包并重新导出，不手动维护另一份控件样式。
