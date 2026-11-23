import { expect, it } from "vitest";
import { bindGitHubSetupReview } from "./setup-review.js";
import { bindGitHubDiagnosis } from "./diagnosis.js";
it("permits repeated assigned GitHub setup observations and pure route assessment, preserving operation authority", async () => {
  const bound = bindGitHubSetupReview(
    "Check current setup",
    false,
    async () =>
      ({
        stage: "needs-token",
        connected: false,
        verified: false,
        credentialId: null,
        credentials: [],
      }) as never,
  );
  const read = bound.services.githubSetupRead.inspect,
    route = bound.services.githubSetupRoute.resolve,
    id = bound.request.operationId;
  const first = await read(id);
  expect(await read(id)).toEqual(first);
  const result = await route(id, "publish");
  expect(await route(id, "publish")).toEqual(result);
  await expect(read("foreign")).rejects.toThrow("assigned setup review");
  await expect(route("foreign", "publish")).rejects.toThrow(
    "assigned GitHub connection",
  );
});
it("permits repeated immutable remote preflight and rejects foreign operation IDs", async () => {
  const bound = bindGitHubDiagnosis("Check this remote", {
    kind: "remote",
    remoteUrl: "https://github.com/example/project.git",
  });
  const read = bound.services.githubDiagnosisRead.inspect,
    id = bound.request.operationId;
  expect(await read(id)).toEqual(await read(id));
  await expect(read("foreign")).rejects.toThrow("assigned GitHub preflight");
});
