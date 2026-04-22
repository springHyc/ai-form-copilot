/**
 * 发版收尾：把 `npm version` 后 package.json 的版本 bump 提交，打 `v<version>` tag，推送到远端。
 * 调用时机：build + pack 都成功之后（见 package.json 的 `build:prod*`）。
 * 设计要点：
 *   - 版本号 bump 时用 `--no-git-tag-version`，让 commit + tag 在 build 成功后才落地，
 *     若打包失败可用 `git checkout package.json package-lock.json` 直接恢复。
 *   - tag 已存在则终止，避免覆盖历史 tag。
 */
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
const tag = `v${version}`;

const sh = (cmd) => execSync(cmd, { cwd: repoRoot, stdio: 'inherit' });
const shCapture = (cmd) => execSync(cmd, { cwd: repoRoot }).toString().trim();

if (shCapture(`git tag -l ${tag}`)) {
  console.error(`[publish-tag] 本地已存在 ${tag}，终止（如需覆盖：git tag -d ${tag}）`);
  process.exit(1);
}

sh('git add package.json');
if (existsSync(resolve(repoRoot, 'package-lock.json'))) sh('git add package-lock.json');

// 若 package.json 在本轮 build 之前就已经是该版本（比如 pack 中途失败后重跑），允许跳过 commit
try {
  sh(`git commit -m "chore: release ${tag}"`);
} catch {
  console.log('[publish-tag] 没有待提交的版本变更，直接打 tag');
}

sh(`git tag ${tag}`);
// 顺序保证：上游 `build:prod*` 已先执行 `pack:dist`，本地 zip 已生成后再进入本脚本。
// 下面第一次 push：推**当前分支**（含上面的 release commit）；第二次：只推 **tag**（远端据此打 Release）。
console.log('[publish-tag] 推送当前分支（含 chore: release commit，zip 已在本地生成）…');
sh('git push');
console.log(`[publish-tag] 推送 tag ${tag} …`);
sh(`git push origin ${tag}`);
console.log(`[publish-tag] 已发布 ${tag}（分支 + tag 均已尝试推送）`);
