---
name: remote-server-onboarding
description: Connect a desktop, mobile, or CLI Vibestudio client to a state server running elsewhere over Iroh.
---

# Connecting to a remote Vibestudio server

Vibestudio's state server can run on a home server, VPS, or remote workstation.
Desktop, mobile, and CLI clients reach it over end-to-end encrypted Iroh QUIC.
The gateway listens only on loopback. There is no public RPC HTTP endpoint,
reverse proxy, VPN, negotiation service, or media relay to deploy.

The server advertises a stable Iroh Endpoint ID and an ordered list of HTTPS
relay URLs. Iroh tries a direct UDP path and falls back to those relays when
there isn't one. Production does not use n0 address lookup or an implicit
public-relay preset. OAuth and webhook callbacks still go through the separate
callback relay; application RPC and assets never do.

## Start or deploy

Install and manage the user service on this machine:

```bash
npm install -g @panticonic/vibestudio-server
vibestudio remote deploy local
```

Use `vibestudio remote deploy user@host` for another computer. Inspect a
deployment with `remote deploy pairing`, `status`, and `logs`; apply releases
with `update`; use `remove` only to decommission it. For a foreground session:

```bash
vibestudio remote serve --port 3030
```

The server requires a configured relay set. Before sharing an invite, run
`vibestudio remote doctor --relay-url <https-url> --relay-url <https-url>`. Pass
`--workspace <name>` to check a workspace child endpoint, or
`--identity <endpoint.key>` to check one identity directly. Doctor checks
release compatibility, identity persistence, relay reachability, endpoint
binding, and that the retired native transport is absent.

The hub and each workspace child have their own private, persistent endpoint
secret. Back up the server state that contains it. Rotating an endpoint changes
its Endpoint ID and invalidates saved reaches, so it is an explicit recovery
step:

```bash
vibestudio remote rotate-endpoint --workspace <name> --yes
```

Do not rotate an endpoint to fix general connectivity problems.

## Pair a client

The compact v4 HTTPS/deep-link payload contains a one-time code, an expiry, the
hub Endpoint ID, and the ordered relay set. It has no certificate fingerprint,
negotiation-room, or candidate-policy fields.

```bash
vibestudio remote pair "https://vibestudio.app/p#..."
```

Desktop can open the same URL; mobile can scan its QR code or open the
HTTPS/deep link. Redeeming it returns a persistent device credential bound to
the user. The client keeps the hub-control reach, routes the selected workspace
ID through that authenticated connection, and stores the child reach it gets
back. Switching workspaces replaces only the child reach; it never creates a
second identity.

One-time links cannot be reused. If redemption never reached the server (for
example, because of a local storage error), fix the error and retry the same
link. Once the server has accepted it, an expired or used link needs a fresh
`remote pair-device` or administrator invite.

## Connection diagnosis

The UI shows connecting, direct, relayed, reconnecting, and offline states. When
relayed, it may show the active relay region. Diagnostics include the path,
relay URL, path changes, RTT, close cause, retry attempt, and endpoint
generation. They never log pairing codes or credentials.

Work from the outside in:

1. Run `remote doctor` with the configured relay set.
2. Check the server service and endpoint registration logs.
3. Tell apart the stable hub-control endpoint and the selected workspace
   endpoint.
4. If only the child reach is stale, re-route the workspace through hub
   control.
5. Rotate an endpoint only when its stored secret is lost or compromised, then
   re-pair the affected clients.

Back up hub identity and membership, endpoint secrets, workspace state,
credentials, Durable Objects, and agent/worker state. Client-side credentials
and cached panel assets are disposable; pairing again recreates them.
