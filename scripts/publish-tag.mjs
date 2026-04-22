/**
 * 发版收尾：`git add` → `commit`（含本轮 `releases/*.zip`）→ 打 `v<version>` tag → `push`。
 * 调用时机：build + pack 都成功之后（见 package.json 的 `build:prod*`）。
 * 设计要点：
 *   - 版本号 bump 时用 `--no-git-tag-version`，让 commit 在 build / 打 zip 成功后才落地；
 *     若中途失败可用 `git checkout package.json package-lock.json` 恢复版本号（已 `git add releases/` 但未 commit 时按需处理工作区）。
 *   - **必须在 push 前 `git add releases/`**：否则 `releases/` 下新生成的 zip 仍是未跟踪文件，远端仓库拿不到发版包。
 *   - `releases/` 不应写入 `.gitignore`（若需忽略请改流程，否则本脚本无法代为入库）。
 *   - tag 已存在则终止，避免覆盖历史 tag。
 */
import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(
  readFileSync(resolve(repoRoot, "package.json"), "utf8"),
);
const tag = `v${version}`;

const sh = (cmd) => execSync(cmd, { cwd: repoRoot, stdio: "inherit" });
const shCapture = (cmd) => execSync(cmd, { cwd: repoRoot }).toString().trim();

if (shCapture(`git tag -l ${tag}`)) {
  console.error(
    `[publish-tag] 本地已存在 ${tag}，终止（如需覆盖：git tag -d ${tag}）`,
  );
  process.exit(1);
}

sh("git add package.json");
if (existsSync(resolve(repoRoot, "package-lock.json")))
  sh("git add package-lock.json");

const releasesDir = resolve(repoRoot, "releases");
if (existsSync(releasesDir)) {
  sh("git add releases/");
}

// 合并提交：版本号 +（若有）本轮 releases 下的 zip；无变更则跳过 commit（例如仅重打 tag 的异常重跑）
try {
  sh(`git commit -m "chore: release ${tag}"`);
} catch {
  console.log("[publish-tag] 没有待提交变更，直接打 tag");
}

sh(`git tag ${tag}`);
sh("git push");
sh(`git push origin ${tag}`);
console.log(`[publish-tag] 已发布 ${tag}`);
