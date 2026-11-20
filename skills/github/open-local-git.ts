import { bindTerminalChecks } from "@workspace-skills/terminal/workflow";
import { normalizeGitHubRemoteUrl } from "./index.js";
import type { GitHubLocalView, GitHubOpenRepository } from "./natlang/types.js";

export type LocalRepoSeed = GitHubOpenRepository & {
  remote: string | null;
  state:
    | "clean"
    | "dirty"
    | "staged"
    | "ahead"
    | "behind"
    | "diverged"
    | "detached";
};

const gitEnvironment =
  'export GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null GIT_TERMINAL_PROMPT=0 GIT_ALLOW_PROTOCOL=\ngit() { /usr/bin/git "$@"; }';
const literal = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";

async function run(script: string): Promise<string> {
  const { request, services } = bindTerminalChecks({
    goal: "Read or maintain only the disposable local Git fixture",
    checks: [
      {
        id: "owned-git",
        purpose: "Run the fixed local Git fixture command",
        prerequisites: [],
        intent: {
          kind: "script",
          script: "set -eu\n" + gitEnvironment + "\n" + script,
        },
        timeoutMs: 8000,
        maxOutputBytes: 8192,
      },
    ],
  });
  const plan = await services.terminalCheckRead.observe(request.operationId);
  const result = await services.terminalCheckRun.execute(
    plan.receipt,
    "owned-git",
  );
  if (
    result.status !== "complete" ||
    result.exitCode !== 0 ||
    result.timedOut ||
    result.truncated
  )
    throw new Error("Owned local Git command failed: " + result.stderr);
  return result.stdout;
}

function populate(repository: LocalRepoSeed): string {
  if (!/^[a-z][a-z0-9-]*$/u.test(repository.id))
    throw new Error("Invalid owned Git fixture identity");
  const statements = [
    `repo="$owned/${repository.id}"`,
    'git init -q --template= -b main "$repo"',
    'cd "$repo"',
    "git config user.email fixture@example.test",
    'git config user.name "Owned Git fixture"',
    'printf "%s\\n" "Original owned note" >README.md',
    "git add README.md",
    'git commit -qm "Initial local history"',
    "base=$(git rev-parse HEAD)",
  ];
  if (repository.remote) {
    statements.push(
      "git remote add origin " + literal(repository.remote),
      "git config branch.main.remote origin",
      "git config branch.main.merge refs/heads/main",
    );
  }
  if (repository.state === "detached")
    statements.push('git checkout -q --detach "$base"');
  if (repository.state === "dirty" || repository.state === "staged") {
    statements.push('printf "%s\\n" "Keep this local field note" >>README.md');
    if (repository.state === "staged") statements.push("git add README.md");
  }
  if (repository.state === "behind" || repository.state === "diverged") {
    statements.push(
      'git checkout -qb upstream-source "$base"',
      'printf "%s\\n" "Owned fixture upstream change" >upstream.md',
      "git add upstream.md",
      'git commit -qm "Upstream mirror change"',
      "git update-ref refs/remotes/origin/main HEAD",
      "git checkout -q main",
    );
  } else if (repository.remote) {
    statements.push('git update-ref refs/remotes/origin/main "$base"');
  }
  if (repository.state === "ahead" || repository.state === "diverged") {
    statements.push(
      'printf "%s\\n" "Owned checkout change" >local.md',
      "git add local.md",
      'git commit -qm "Local change"',
    );
  }
  return statements.join("\n");
}

export async function prepareLocalGit(repositories: LocalRepoSeed[]) {
  const keys = new Set(repositories.map(({ id }) => id));
  if (keys.size !== repositories.length || !keys.size)
    throw new Error("The owned Git fixture needs distinct repositories");
  const token = crypto.randomUUID();
  const commands = repositories.map(populate).join("\n");
  const root = (
    await run(`owned=$(mktemp -d /tmp/vibe-github-owned.XXXXXXXX)
trap 'rm -rf -- "$owned"' EXIT
printf '%s' ${literal(token)} >"$owned/.owner"
${commands}
printf '%s\\n' "$owned"
trap - EXIT`)
  ).trim();
  if (!/^\/tmp\/vibe-github-owned\.[A-Za-z0-9]{8}$/u.test(root))
    throw new Error("The native Git fixture did not mint its owned directory");
  const ownerProof = `owned=${literal(root)}
test "$(cat "$owned/.owner")" = ${literal(token)}`;

  async function inspect(id: string) {
    const repository = repositories.find((row) => row.id === id);
    if (!repository)
      throw new Error("Only the assigned Git repositories can be inspected");
    const raw = await run(`${ownerProof}
cd "$owned/${id}"
git rev-parse HEAD
git symbolic-ref --quiet --short HEAD || echo -
git rev-parse --verify refs/remotes/origin/main 2>/dev/null || echo -
git config --get remote.origin.url || echo -
if git show-ref --verify --quiet refs/remotes/origin/main; then
  git rev-list --left-right --count HEAD...refs/remotes/origin/main
else
  printf '0 0\\n'
fi
git status --porcelain=v1 --untracked-files=all
git diff HEAD --binary | /usr/bin/sha256sum
git diff --cached --binary | /usr/bin/sha256sum`);
    const [head, rawBranch, tracked, remote, counts, ...rows] = raw
      .trimEnd()
      .split("\n");
    const [ahead, behind] = counts?.trim().split(/\s+/u).map(Number) ?? [];
    const stagedDigest = rows.pop();
    const worktreeDigest = rows.pop();
    if (
      !head ||
      !rawBranch ||
      !tracked ||
      !remote ||
      !stagedDigest ||
      !worktreeDigest ||
      !Number.isSafeInteger(ahead) ||
      !Number.isSafeInteger(behind)
    )
      throw new Error("The local Git evidence could not be decoded");
    let normalizedRemote = null;
    if (remote !== "-") {
      try {
        normalizedRemote = normalizeGitHubRemoteUrl(remote);
      } catch {}
    }
    const remoteOwner = normalizedRemote
      ? (new URL(normalizedRemote).pathname.split("/")[1] ?? null)
      : null;
    const { id: repositoryId, title, intendedOwner } = repository;
    const view: Omit<GitHubLocalView, "id"> = {
      repository: { id: repositoryId, title, intendedOwner },
      head,
      branch: rawBranch === "-" ? null : rawBranch,
      trackedHead: tracked === "-" ? null : tracked,
      ahead: ahead!,
      behind: behind!,
      changes: rows,
      remote: remote === "-" ? null : remote,
      normalizedRemote,
      remoteOwner,
    };
    return { view, worktreeDigest, stagedDigest };
  }

  return {
    inspect,
    async close() {
      await run(ownerProof + '\nrm -rf -- "$owned"');
    },
  };
}
