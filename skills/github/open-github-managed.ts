import { isDeepStrictEqual } from "node:util";
import {
  contextId,
  fs,
  vcs,
  type StoredCredentialSummary,
} from "@workspace/runtime";
import {
  GitHubCredentialSetupError,
  GitHubCredentialsUnavailableError,
  preflightGitHubPublishCredential,
} from "@workspace/integrations/github";
import { githubBindings } from "@workspace/integrations/providers";
import { GITHUB_ACCESS_LEVELS, accessLevelCovers } from "./index.js";
import { bindGitHubSetupReview } from "./setup-review.js";
import { prepareLocalGit, type LocalRepoSeed } from "./open-local-git.js";
import fixes from "./natlang/troubleshootGithub/steps.js";
import type {
  FailureCause,
  GitHubAccessLevel,
  GitHubApproval,
  GitHubLocalView,
  GitHubOpenCatalog,
  GitHubOpenDecision,
  GitHubOpenHandoff,
  GitHubOpenIntent,
  GitHubOpenPreflight,
  GitHubOpenProfile,
  GitHubOpenRoute,
  GitHubSetupReport,
  OpenGitHubReport,
} from "./natlang/types.js";

type Profile = GitHubOpenProfile & {
  stage: "connected" | "verified" | "error";
  access: GitHubAccessLevel;
  omitGitBinding?: boolean;
};
export type OpenGitHubWorld = {
  kind: "githubWork";
  workspace: "personal";
  id: string;
  goal: string;
  sourceGroup: string;
  split?: "test";
  repositories: LocalRepoSeed[];
  profiles: Profile[];
  approvalRecheck?: { profileId: string; current: GitHubApproval };
  interactive: boolean;
  expected: {
    intent: GitHubOpenIntent;
    access: GitHubAccessLevel;
    route: GitHubOpenRoute;
    preflight: GitHubOpenPreflight["status"] | null;
    setup: GitHubSetupReport["handoff"] | null;
    diagnosis?: FailureCause;
    retained: string[];
    stage: boolean;
    git: {
      branch: string | null;
      ahead: number;
      behind: number;
      changes: string[];
      remoteOwner: string | null;
    };
  };
};

type Wrapper = { status: string; skill: string; outcome?: OpenGitHubReport };
type Setup = ReturnType<typeof bindGitHubSetupReview>;
type JournalRow = {
  service: string;
  method: string;
  args: unknown[];
  result: unknown;
};

function summary(profile: Profile): StoredCredentialSummary {
  return {
    id: profile.id,
    label: profile.label,
    audience: [{ url: "https://api.github.com/", match: "origin" }],
    scopes: [...GITHUB_ACCESS_LEVELS[profile.access].scopes],
    injection: {
      type: "header",
      name: "authorization",
      valueTemplate: "Bearer {token}",
    },
    lifecycle: { state: "active", canRefresh: false },
    metadata: {
      providerId: "github",
      accessLevel: profile.access,
      targetName: profile.owner,
    },
    bindings: [
      githubBindings.user,
      ...(!profile.omitGitBinding ? [githubBindings.gitHttp] : []),
    ],
  };
}

function publicProfile(profile: Profile): GitHubOpenProfile {
  const { id, owner, label, approval, retained } = profile;
  return {
    id,
    owner,
    label,
    approval,
    retained: retained.filter((row) => row.owner === owner),
  };
}

export async function prepareOpenGitHub(world: OpenGitHubWorld) {
  if (!contextId) throw new Error("An owned Git review context is required");
  const ownerContext = contextId;
  const before = await vcs.status({ contextId });
  const local = await prepareLocalGit(world.repositories);
  try {
    const start = new Map(
      await Promise.all(
        world.repositories.map(
          async ({ id }) => [id, await local.inspect(id)] as const,
        ),
      ),
    );
    const root = await fs.mkdtemp("github-open");
    const profileFile = root + "/profile-ledger.json";
    const handoffFile = root + "/next-step.json";
    const records = JSON.stringify(world.profiles);
    const recheck = world.approvalRecheck;
    const recheckTarget =
      recheck && world.profiles.find(({ id }) => id === recheck.profileId);
    if (
      recheck &&
      (!recheckTarget || recheckTarget.owner !== recheck.current.owner)
    )
      throw new Error("The new approval belongs to an unrelated owner");
    const revisedProfiles = world.profiles.map((profile) =>
      recheck && profile.id === recheck.profileId
        ? {
            ...profile,
            approval: recheck.current,
            retained: [...profile.retained, profile.approval],
          }
        : profile,
    );
    const revisedRecords = JSON.stringify(revisedProfiles);
    let currentRecords = records;
    await fs.writeFile(profileFile, records);
    const readProfiles = async (): Promise<Profile[]> =>
      JSON.parse(await fs.readFile(profileFile, "utf8"));
    const catalog: GitHubOpenCatalog = {
      revision: crypto.randomUUID(),
      repositories: [...start.values()].map(({ view }) => view.repository),
      profiles: (await readProfiles()).map(publicProfile),
      interactive: world.interactive,
    };
    const journal: JournalRow[] = [];
    const record = <T>(
      service: string,
      method: string,
      args: unknown[],
      result: T,
    ) => {
      journal.push(structuredClone({ service, method, args, result }));
      return structuredClone(result);
    };
    const open = <T>(method: string, args: unknown[], result: T) =>
      record("openGitHubWork", method, args, result);
    let discovered = false;
    let observed: GitHubLocalView | undefined;
    let provider: GitHubOpenPreflight | undefined;
    let boundIntent: GitHubOpenIntent | undefined;
    let requestedAccess: GitHubAccessLevel | undefined;
    let setup: Setup | undefined;
    let stageClaim = false;
    let receipt: GitHubOpenHandoff | null = null;

    async function preflight(
      intent: GitHubOpenIntent,
      access: GitHubAccessLevel,
    ): Promise<GitHubOpenPreflight> {
      if (recheck && currentRecords !== revisedRecords) {
        if ((await fs.readFile(profileFile, "utf8")) !== currentRecords)
          throw new Error("The setup ledger changed outside its owned recheck");
        await fs.writeFile(profileFile, revisedRecords);
        currentRecords = revisedRecords;
      }
      const profiles = await readProfiles();
      const selected = intent.profileId
        ? profiles.find(({ id }) => id === intent.profileId)
        : undefined;
      const destination =
        intent.explicitOwner ?? observed!.repository.intendedOwner;
      let status: GitHubOpenPreflight["status"] = "available";
      let failure: string | null = null;
      if (
        (intent.profileId && (!selected || selected.owner !== destination)) ||
        destination !== observed!.repository.intendedOwner
      ) {
        status = "wrong-owner";
      } else if (!selected && profiles.length) {
        status = "ambiguous";
      } else if (selected?.stage === "error") {
        status = "profile-unavailable";
      } else {
        try {
          if (
            access === "publish" ||
            access === "publish-pages" ||
            access === "collaborate"
          ) {
            const publication =
              access === "publish"
                ? "repository"
                : access === "publish-pages"
                  ? "pages"
                  : "existing-repository";
            await preflightGitHubPublishCredential(
              {
                listStoredCredentials: async () =>
                  selected ? [summary(selected)] : [],
              },
              {
                owner: destination,
                publication,
                ...(selected && { credentialId: selected.id }),
              },
            );
          } else if (!selected) {
            throw new GitHubCredentialsUnavailableError(
              "No active GitHub credential is available.",
            );
          } else if (
            access !== "read-only" &&
            !accessLevelCovers(selected.access, access)
          ) {
            status = "scope-or-binding";
            failure =
              "GitHub credential is missing permission for the requested access.";
          }
        } catch (error) {
          if (error instanceof GitHubCredentialsUnavailableError)
            status = "unconnected";
          else if (error instanceof GitHubCredentialSetupError)
            status = "scope-or-binding";
          else throw error;
          failure = error.message;
        }
      }
      if (status !== "wrong-owner" && status !== "ambiguous") {
        setup = bindGitHubSetupReview(
          world.goal,
          world.interactive,
          async () => ({
            stage: selected?.stage ?? "needs-token",
            connected:
              selected?.stage === "verified" || selected?.stage === "connected",
            verified: selected?.stage === "verified",
            ...(selected && selected.stage !== "error"
              ? { credentialId: selected.id, credentials: [summary(selected)] }
              : { credentials: [] }),
            nextActions: [],
            warnings: [],
          }),
        );
      }
      return {
        id: crypto.randomUUID(),
        status,
        failure,
        profile:
          selected && selected.owner === destination && status !== "wrong-owner"
            ? publicProfile(selected)
            : null,
        setup: setup?.request ?? null,
      };
    }

    const services = {
      openGitHubWork: {
        async discover() {
          discovered = true;
          return open("discover", [], catalog);
        },
        async inspect(revision: string, id: string) {
          if (
            !discovered ||
            revision !== catalog.revision ||
            observed ||
            !start.has(id)
          )
            return open("inspect", [revision, id], null);
          observed = {
            ...(await local.inspect(id)).view,
            id: crypto.randomUUID(),
          };
          return open("inspect", [revision, id], observed);
        },
        async preflight(
          revision: string,
          intent: GitHubOpenIntent,
          access: GitHubAccessLevel,
        ) {
          if (
            provider ||
            !observed ||
            revision !== observed.id ||
            intent?.repositoryId !== observed.repository.id ||
            intent.localOnly ||
            !Object.hasOwn(GITHUB_ACCESS_LEVELS, access)
          )
            return open("preflight", [revision, intent, access], null);
          boundIntent = structuredClone(intent);
          requestedAccess = access;
          provider = await preflight(intent, access);
          return open("preflight", [revision, intent, access], provider);
        },
        async stage(revision: string, decision: GitHubOpenDecision) {
          const profile = provider?.profile ?? null;
          const ownedApprovals = profile?.retained.map(({ id }) => id) ?? [];
          if (
            stageClaim ||
            !observed ||
            revision !== (provider?.id ?? observed.id) ||
            decision?.profileId !== (profile?.id ?? null) ||
            decision?.currentApproval !== (profile?.approval.id ?? null) ||
            !isDeepStrictEqual(decision?.retainedApprovals, ownedApprovals) ||
            !decision?.reason?.trim()
          ) {
            return open("stage", [revision, decision], null);
          }
          stageClaim = true;
          const now = await local.inspect(observed.repository.id);
          const { id: _id, ...basis } = observed;
          if (
            !isDeepStrictEqual(now.view, basis) ||
            (await fs.readFile(profileFile, "utf8")) !== currentRecords
          )
            return open("stage", [revision, decision], null);
          const handoff = { revision, receipt: crypto.randomUUID(), decision };
          await fs.writeFile(handoffFile, JSON.stringify(handoff));
          const durable: GitHubOpenHandoff = JSON.parse(
            await fs.readFile(handoffFile, "utf8"),
          );
          receipt = isDeepStrictEqual(durable, handoff) ? durable : null;
          return open("stage", [revision, decision], receipt);
        },
      },
      githubSetupRead: {
        async inspect(id: string) {
          if (!setup)
            throw new Error("No owner-bound setup review is available");
          return record(
            "githubSetupRead",
            "inspect",
            [id],
            await setup.services.githubSetupRead.inspect(id),
          );
        },
      },
      githubSetupRoute: {
        async resolve(id: string, access: GitHubAccessLevel) {
          if (!setup || access !== requestedAccess)
            throw new Error("Use the exact owner-bound access being reviewed");
          return record(
            "githubSetupRoute",
            "resolve",
            [id, access],
            await setup.services.githubSetupRoute.resolve(id, access),
          );
        },
      },
    };

    async function verify(wrapper: Wrapper | null) {
      const outcome =
        wrapper?.status === "workspace-skill-reviewed" &&
        wrapper.skill === world.kind &&
        wrapper.outcome?.status === "reviewed"
          ? wrapper.outcome
          : null;
      const final = new Map(
        await Promise.all(
          world.repositories.map(
            async ({ id }) => [id, await local.inspect(id)] as const,
          ),
        ),
      );
      const expected = world.expected;
      const saved = receipt
        ? JSON.parse(await fs.readFile(handoffFile, "utf8"))
        : null;
      const files = await fs.readdir(root);
      const after = await vcs.status({ contextId: ownerContext });
      const read = (service: string) =>
        journal.find((row) => row.service === service)?.result;
      const truth = final.get(expected.intent.repositoryId)?.view;
      const profileLedger = (await readProfiles()).map(publicProfile);
      const expectedAccount = revisedProfiles.find(
        ({ id }) => id === expected.intent.profileId,
      );
      const checks = {
        exactOwnedRepository: Boolean(
          observed &&
          observed.repository.id === expected.intent.repositoryId &&
          isDeepStrictEqual(outcome?.local, observed) &&
          isDeepStrictEqual(outcome?.intent, expected.intent) &&
          truth?.remote ===
            world.repositories.find(
              (repo) => repo.id === expected.intent.repositoryId,
            )?.remote &&
          truth?.branch === expected.git.branch &&
          truth.ahead === expected.git.ahead &&
          truth.behind === expected.git.behind &&
          isDeepStrictEqual(truth.changes, expected.git.changes) &&
          truth.remoteOwner === expected.git.remoteOwner,
        ),
        exactGitHubPreflight:
          (provider?.status ?? null) === expected.preflight &&
          isDeepStrictEqual(outcome?.preflight, provider ?? null) &&
          (!provider ||
            (requestedAccess === expected.access &&
              isDeepStrictEqual(boundIntent, expected.intent))) &&
          (outcome?.diagnosis?.cause ?? null) === (expected.diagnosis ?? null),
        currentOwnerSetup:
          (outcome?.setup?.handoff ?? null) === expected.setup &&
          (expected.setup
            ? isDeepStrictEqual(
                outcome?.setup?.status,
                read("githubSetupRead"),
              ) &&
              isDeepStrictEqual(
                outcome?.setup?.route,
                read("githubSetupRoute"),
              ) &&
              outcome?.setup?.accessLevel === expected.access
            : !setup && outcome?.setup === null),
        exactGitHubDecision:
          outcome?.decision.route === expected.route &&
          outcome.decision.access === expected.access &&
          outcome.decision.profileId ===
            (expectedAccount && provider?.profile
              ? expectedAccount.id
              : null) &&
          outcome.decision.currentApproval ===
            (provider?.profile?.approval.id ?? null) &&
          isDeepStrictEqual(
            outcome.decision.retainedApprovals,
            expected.retained,
          ) &&
          Boolean(outcome.decision.reason?.trim()),
        preservedLocalAndOwnerState:
          isDeepStrictEqual(start, final) &&
          (await fs.readFile(profileFile, "utf8")) ===
            (expected.preflight ? revisedRecords : records) &&
          after.mainEventId === before.mainEventId &&
          isDeepStrictEqual(after.workingHead, before.workingHead),
        independentlyReadLocalHandoff: expected.stage
          ? Boolean(
              receipt &&
              isDeepStrictEqual(saved, receipt) &&
              isDeepStrictEqual(outcome?.handoff, saved) &&
              isDeepStrictEqual(saved.decision, outcome?.decision) &&
              files.includes("next-step.json"),
            )
          : !receipt &&
            outcome?.handoff === null &&
            !files.includes("next-step.json"),
      };
      return {
        caseId: world.id,
        goal: world.goal,
        contextId: ownerContext,
        checks,
        catalog,
        journal,
        local: truth,
        profileLedger,
        handoff: saved,
        passed: Object.values(checks).every(Boolean),
      };
    }

    async function qualify() {
      const port = services.openGitHubWork;
      const { revision } = await port.discover();
      const {
        intent,
        access,
        route,
        preflight: pc,
        setup: handoff,
        stage,
        diagnosis,
        retained,
      } = world.expected;
      const rejectsAlias =
        (await port.inspect("foreign-catalog", intent.repositoryId)) === null;
      const localView = await port.inspect(revision, intent.repositoryId);
      if (!localView)
        throw new Error("Reference could not inspect its repository");
      const preflight = pc
        ? await port.preflight(localView.id, intent, access)
        : null;
      let reviewed: GitHubSetupReport | null = null;
      if (handoff && preflight?.setup) {
        const { operationId } = preflight.setup;
        const status = await services.githubSetupRead.inspect(operationId);
        const route = await services.githubSetupRoute.resolve(
          operationId,
          access,
        );
        reviewed = { status, accessLevel: access, route, handoff };
      }
      const decision: GitHubOpenDecision = {
        route,
        access,
        profileId: preflight?.profile?.id ?? null,
        currentApproval: preflight?.profile?.approval.id ?? null,
        retainedApprovals: retained,
        reason: "Continue only from the exact local and approval evidence.",
      };
      const now = preflight?.id ?? localView.id;
      const rejectsBasis =
        (await port.stage("different-view", decision)) === null;
      const rejectsForeignApproval =
        (await port.stage(now, {
          ...decision,
          currentApproval: "other-owner",
        })) === null;
      const outcome: OpenGitHubReport = {
        status: "reviewed",
        intent,
        local: localView,
        preflight,
        setup: reviewed,
        diagnosis: diagnosis ? fixes(diagnosis) : null,
        decision,
        handoff: stage ? await port.stage(now, decision) : null,
      };
      const wrapper = {
        status: "workspace-skill-reviewed",
        skill: world.kind,
        outcome,
      };
      const result = await verify(wrapper);
      const rejectsWrongRoute = !(
        await verify({
          ...wrapper,
          outcome: {
            ...outcome,
            decision: {
              ...decision,
              route:
                route === "report-local" ? "ready-for-owner" : "report-local",
            },
          },
        })
      ).passed;
      return {
        ...result,
        checks: {
          ...result.checks,
          rejectsAlias,
          rejectsBasis,
          rejectsForeignApproval,
          rejectsWrongRoute,
        },
        passed:
          result.passed &&
          rejectsAlias &&
          rejectsBasis &&
          rejectsForeignApproval &&
          rejectsWrongRoute,
      };
    }

    return { services, verify, qualify, close: local.close };
  } catch (error) {
    await local.close();
    throw error;
  }
}
