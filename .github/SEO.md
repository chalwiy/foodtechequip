# FTE sitemap 与 IndexNow 维护说明

本目录是 GitHub 仓库配置，不是面向客户的网页。无需 pip 包、数据库或浏览器插件。

## 上传与首次启用

1. 将“纯静态页面”里面的全部文件放到 chalwiy/foodtechequip 的 main 根目录，不能多套一层文件夹。包括 .github、.nojekyll、CNAME、robots.txt、sitemap.xml 和根目录验证 txt 文件。在 Windows 资源管理器打开“查看 → 显示 → 隐藏的项目”和“文件扩展名”，确认文件没有变成 .yml.txt。
2. GitHub Settings → Pages 选择 Deploy from a branch、main、/(root)，Custom domain 为 www.foodtechequip.com，证书准备好后启用 Enforce HTTPS。不要同时建立另一套 Actions 部署工作流。
3. 允许 Actions 运行所需的官方 actions/checkout。维护 job 声明 contents: write 和 pages: write；测试 job 只读。不需要个人访问令牌。不为机器人关闭分支保护；若写入被规则拒绝，请按仓库允许的流程处理。
4. 当前本地已切换正式生产配置：indexable=true、address_confirmed=true，147个正常页面允许索引，404保持noindex，robots允许抓取。此状态尚未上传；上传后仍须核对实际线上文件。不得将本地配置完成描述为已经收录。
5. 确认正式域名 HTTPS 页面、robots.txt、sitemap.xml 和 seo-config.json 中 key 对应的根目录 txt 已实际在线可访问。该验证 key 为本网站独立生成的公开站点验证内容，不是访问 GitHub 的凭据。不要复用母公司 key，也不要每次构建重新生成。
6. Actions → FTE sitemap and IndexNow → Run workflow，execute 不勾选，先看 dry-run 日志。确认无误后手动勾选 execute 才会提交。首次完整通知建议手动执行，不依赖首次上传恰好完成部署的时机。

## 触发和发布顺序

- 推送 main：更新 sitemap，按变更 HTML 通知；包括删除和改名旧路径。
- 手动：默认预览，不写仓库，不访问线上；execute=true 才真正运行，并选择所有符合条件的当前 HTML。
- 每天 UTC 02:23（北京时间 10:23）：恢复 sitemap，不每天重提全站。GitHub 调度可能延迟；长期不活跃的公开仓库可能被停用调度，请定期查看 Actions。
- sitemap 使用 Git 的页面提交日期，缺失日期省略；404、noindex、跳转、其他 canonical 与内部目录排除；不自动修改原网页。
- 全站禁止索引：保留旧 sitemap，正常跳过，不重建、不提交。页面允许索引但 robots 阻止时明确失败，避免发布矛盾配置。
- sitemap 发生变化时先暂存再检查、提交并正常 push。GITHUB_TOKEN 的提交不会自动触发普通 Pages 构建，所以显式请求 Pages 重建并等待准确提交构建成功。写入串行，不强推。用户同时更新引起冲突时失败，重新运行最新 main。
- 真正 IndexNow 提交前比较线上验证文件、robots、sitemap 及每个现存待提交 HTML 的实际内容。尚未部署、缓存仍旧、发生意外重定向或删除地址仍返回正文时停止；完成部署后重新手动运行。没有把“请求构建”当成“部署成功”。
- 通知按最多 10,000 URL 分批，临时错误有限重试。200 表示接收，202 表示已接受且验证可能待完成，均不保证收录。IndexNow 不是 Google 的通用收录提交接口。

## 本地命令（仓库根目录）

需要 Python 3 和 Git，仅维护时使用，客户浏览网站不需要。

```text
python -B -m unittest discover -s .github/tests -v
python -B .github/scripts/maintain.py
python -B .github/scripts/seo_automation.py sitemap --output 临时文件.xml
python -B .github/scripts/seo_automation.py indexnow 待提交文件列表.txt --dry-run
```

maintain.py 不带 --execute 时不提交、不重建、不调用 IndexNow；sitemap 命令则会写指定的本地输出。不要在不必要时运行带 --execute 的维护脚本。全部测试使用临时 Git 仓库和模拟网络。

## 日常维护与排错

维护源版本在“正式页面/automation”，export-local.py 最后调用 sync-seo-automation.py 复制到成品。名称、域名和 key 配置在 .github/seo-config.json；改域名还需同步部署配置、CNAME、canonical 等。本次只支持已确认的 FTE 主域名，避免误提交其他网站。

重新上传时保留 .github、验证 txt、CNAME、.nojekyll、robots 和 sitemap。GitHub 机器人更新过 sitemap 后，本地上传前先同步远程版本，避免重新覆盖为旧 sitemap。

Actions 中查看失败步骤和详细日志，修正后在最新 main 上重新 Run workflow。分支权限、Pages 未开启、错误发布模式、robots 冲突、线上版本不一致、key 不匹配会明确报错。任务失败不会自动降低保护、换用其他托管或强推。

工作流文件采用格式化 JSON（YAML 1.2 的合法子集），因此可使用 Python 标准库进行严格语法及字段校验，不需要额外 YAML 依赖。

参考官方文档：
- https://www.indexnow.org/documentation
- https://docs.github.com/en/actions/concepts/security/github_token
- https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build
- https://www.sitemaps.org/protocol.html

本地测试不代表 GitHub Actions 已在线运行。上传后的实际 Actions、Pages 构建、域名、证书、验证文件和 IndexNow 响应仍需在线验收。收录、排名和曝光由搜索系统决定。
