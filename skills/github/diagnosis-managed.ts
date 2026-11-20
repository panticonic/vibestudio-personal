import { isDeepStrictEqual } from "node:util";
import { contextId, vcs } from "@workspace/runtime";
import type { bindGitHubDiagnosis } from "./diagnosis.js";
import type {
  GitHubDiagnosisObservation,
  GitHubAccessLevel,
  GitHubSetupHandoff,
  GitHubDiagnosisReport,
  GitHubSetupReceipt,
  GitHubSetupStatus,
} from "./natlang/types.js";

type Input = { contextId: string; caseId: string };
type World = {
  id: string;
  goal: string;
  check: Parameters<typeof bindGitHubDiagnosis>[1];
  failure: GitHubDiagnosisObservation["failure"];
  cause: NonNullable<GitHubDiagnosisReport["diagnosis"]>["cause"];
  step: string;
  setup: { access: GitHubAccessLevel; handoff: GitHubSetupHandoff } | null;
};
type Ports = {
  bind: typeof bindGitHubDiagnosis;
  countCredentials(): Promise<number>;
};

export async function prepareManagedGitHubDiagnosis(
  input: Input,
  world: World,
  ports: Ports,
) {
  if (world.id !== input.caseId || input.contextId !== contextId)
    throw new Error("Unknown GitHub diagnosis assignment");
  const [before, credentialCount] = await Promise.all([
    vcs.status({ contextId }),
    ports.countCredentials(),
  ]);
  const bound = ports.bind(world.goal, world.check);
  let observation: GitHubDiagnosisObservation | null = null;
  let status: GitHubSetupStatus | null = null;
  let route: GitHubSetupReceipt | null = null;
  const { githubSetupRead, githubSetupRoute } = bound.services;
  const services = {
    githubDiagnosisRead: {
      async inspect(id: string) {
        observation = await bound.services.githubDiagnosisRead.inspect(id);
        return structuredClone(observation);
      },
    },
    ...(githubSetupRead && githubSetupRoute
      ? {
          githubSetupRead: {
            async inspect(id: string) {
              status = await githubSetupRead.inspect(id);
              return structuredClone(status);
            },
          },
          githubSetupRoute: {
            async resolve(
              ...args: Parameters<typeof githubSetupRoute.resolve>
            ) {
              route = await githubSetupRoute.resolve(...args);
              return structuredClone(route);
            },
          },
        }
      : {}),
  };
  const diagnosis = { cause: world.cause, steps: [world.step] };

  async function verify(report: GitHubDiagnosisReport | null) {
    const [after, finalCount] = await Promise.all([
      vcs.status({ contextId }),
      ports.countCredentials(),
    ]);
    const checks = {
      failure:
        observation?.operationId === bound.request.operationId &&
        observation.failure === world.failure &&
        (world.setup
          ? observation.setup?.goal === world.goal &&
            world.check.kind === "publish" &&
            observation.setup.interactive === world.check.interactive
          : observation.setup === null),
      report:
        isDeepStrictEqual(report?.observation, observation) &&
        isDeepStrictEqual(report?.diagnosis, diagnosis),
      owner: world.setup
        ? isDeepStrictEqual(status, {
            stage: "needs-token",
            connected: false,
            verified: false,
          }) &&
          route?.action === "render-setup" &&
          route.accessLevel === world.setup.access &&
          isDeepStrictEqual(report?.setup?.status, status) &&
          isDeepStrictEqual(report?.setup?.route, route) &&
          report?.setup?.accessLevel === world.setup.access &&
          report.setup.handoff === world.setup.handoff
        : report?.setup === null && status === null && route === null,
      preserved:
        before.mainEventId === after.mainEventId &&
        isDeepStrictEqual(before.workingHead, after.workingHead) &&
        credentialCount === finalCount &&
        (!world.setup || credentialCount === 0),
    };
    return {
      ...input,
      request: bound.request,
      observation,
      status,
      route,
      checks,
      passed: Object.values(checks).every(Boolean),
    };
  }

  return {
    request: bound.request,
    services,
    verify,
    async qualify() {
      const observed = await services.githubDiagnosisRead.inspect(
        bound.request.operationId,
      );
      let setup: GitHubDiagnosisReport["setup"] = null;
      if (
        world.setup &&
        observed.setup &&
        services.githubSetupRead &&
        services.githubSetupRoute
      ) {
        const status = await services.githubSetupRead.inspect(
          observed.setup.operationId,
        );
        const route = await services.githubSetupRoute.resolve(
          observed.setup.operationId,
          world.setup.access,
        );
        setup = {
          status,
          route,
          accessLevel: world.setup.access,
          handoff: world.setup.handoff,
        };
      }
      return verify({ observation: observed, diagnosis, setup });
    },
  };
}
