import { execFileSync } from "node:child_process";

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

export function commitDataIfChanged(root) {
  if (process.env.GITHUB_ACTIONS !== "true") {
    console.log("Not running in GitHub Actions. Data files were written and not committed.");
    return { committed: false, reason: "local" };
  }
  git(["add", "--", "data"], root);
  const staged = git(["diff", "--cached", "--name-only", "--", "data"], root);
  if (!staged.trim()) {
    console.log("No data changes to commit.");
    return { committed: false, reason: "clean" };
  }
  const author = [
    "-c",
    "user.email=41898282+github-actions[bot]@users.noreply.github.com",
    "-c",
    "user.name=github-actions[bot]",
  ];
  git([...author, "commit", "-m", "chore(desk): update gold research data"], root);
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], root);
  try {
    git(["push", "origin", `HEAD:${branch}`], root);
  } catch (err) {
    console.error(`Push failed, retrying once after rebase: ${err.message}`);
    git(["fetch", "origin", branch], root);
    git(["rebase", `origin/${branch}`], root);
    git(["push", "origin", `HEAD:${branch}`], root);
  }
  console.log(`Committed and pushed data changes on ${branch}.`);
  return { committed: true, branch };
}
