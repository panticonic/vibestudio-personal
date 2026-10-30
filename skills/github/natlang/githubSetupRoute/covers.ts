/**
 * Which held access level is enough for a needed one: every fine-grained permission the needed level asks for is held at
 * that strength or stronger. Derived from `GITHUB_ACCESS_LEVELS` in index.ts, which `index.test.ts` checks it against.
 */
import type { GitHubAccessLevel } from "../types.js";

export const COVERS: Record<GitHubAccessLevel, GitHubAccessLevel[]> = {
  "read-only": ["read-only"],
  collaborate: ["read-only", "collaborate"],
  publish: ["publish"],
  "publish-pages": ["publish-pages"],
  "code-workflows": ["read-only", "collaborate", "code-workflows"],
  broad: ["read-only", "collaborate", "publish", "code-workflows", "broad"],
};

export default function covers(held: GitHubAccessLevel, needed: GitHubAccessLevel): boolean {
  return COVERS[held].includes(needed);
}
