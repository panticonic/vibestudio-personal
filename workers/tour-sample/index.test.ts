import { describe, expect, it } from "vitest";
import { rpcMethodAuthority, rpcExposedMethodNames } from "@vibestudio/rpc";
import { createTestDO } from "@vibestudio/durable/test-utils";
import {
  parseAuthorityRequests,
  parseUserlandCapabilities,
} from "@vibestudio/shared/authorityManifest";
import { TourSample } from "./index";
import manifest from "./package.json";
import tourManifest from "../../panels/tour/package.json";
import { userlandReceiverResourceKey } from "@vibestudio/shared/authority/userlandResources";
import { readFileSync } from "node:fs";
import { parseTemplateManifestContent } from "@vibestudio/workspace/templateManifest";

describe("tour sample", () => {
  it("bounds service admission and the receiver-owned read to their exact resources", () => {
    const requests = parseAuthorityRequests(tourManifest.vibestudio.authority);
    for (const capability of [
      "workspace-service:tour-sample",
      "userland:workers/tour-sample/sample.read#*",
    ]) {
      expect(
        requests.find((request) => request.capability === capability)?.resource,
      ).toEqual({
        kind: "exact",
        key:
          capability === "workspace-service:tour-sample"
            ? "do:workers/tour-sample:TourSample:sample"
            : userlandReceiverResourceKey(
                "tour-sample",
                "workers/tour-sample",
                "TourSample",
                "sample",
              ),
      });
    }
  });
  it("admits host lifecycle calls without opening the sample read to host principals", () => {
    const config = parseTemplateManifestContent(
      readFileSync(
        new URL("../../meta/vibestudio.yml", import.meta.url),
        "utf8",
      ),
      0,
    );
    const service = config.top.services?.find(
      (entry) => entry.name === "tour-sample",
    );
    expect(service?.authority.principals).toEqual(["host", "code"]);
    expect(service).toMatchObject({
      durableObject: { className: "TourSample" },
    });
  });
  it("exposes only a gated, read-only fictional resource", async () => {
    const { instance: sample, db } = await createTestDO(TourSample);
    try {
      expect([...rpcExposedMethodNames(sample)]).toContain("read");
      expect(rpcMethodAuthority(sample, "read")).toMatchObject({
        principals: ["code"],
        tier: "gated",
        sensitivity: "read",
        effect: {
          kind: "userland-capability",
          capability: "sample.read",
          resource: { kind: "receiver-object" },
        },
      });
      expect(sample.read()).toEqual({
        title: "A windowsill garden",
        minutes: 6,
      });
    } finally {
      db.close();
    }
  });
  it("requests no host effects and offers the installed caller’s once/version choices", () => {
    expect(parseAuthorityRequests(manifest.vibestudio.authority)).toEqual([]);
    expect(
      parseUserlandCapabilities(manifest.vibestudio.authority.provides)[0]
        ?.grantScopes,
    ).toEqual(["once", "version"]);
  });
});
