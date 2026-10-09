---
name: browser-environment
description: Import and manage non-sensitive browser records, open browser tabs as panels, and launch sealed host imports for protected browser data.
---

# Browser Environment

Use the `browserData` client from `@workspace/runtime`. Use `docs_search` and
`docs_open` for the live method schemas.

The browser environment is derived from the verified user and workspace. Never
ask for or pass a user ID, environment key, Electron partition, source profile,
or filesystem path.

## Import

An import is a one-time migration snapshot, not a sync.

For setup the user drives, open `about/browser-import-inspector`. It handles
device and browser selection, data categories, preview, warnings, progress,
cancellation, retry, and history in one workflow. Do not recreate it as chat
questions or a chain of feedback forms. Do not ask users for internal host IDs,
source IDs, profile paths, or import job IDs.

If you open the inspector only to automate, diagnose, or verify it, treat the
panel as temporary: keep its handle, archive it when you are done (including on
failure), and do not leave it in the user's panel tree. A panel opened for the
user's ongoing migration is not temporary and should stay open.

Use this API sequence for automation, diagnostics, or code that already has a
complete selection the user approved:

1. `listImportHosts()`
2. `listImportSources(hostId)`
3. `previewImport({ hostId, sourceId, dataTypes })`, for bookmarks, history,
   search engines, and favicons only.
4. `startImport({ hostId, sourceId, dataTypes })` for those non-sensitive
   categories.
5. For cookies, passwords, or form fill:
   - Call `previewSensitiveImport({ hostId, sourceId, dataTypes })` for
     aggregate review counts.
   - Call `startSensitiveImport({ hostId, sourceId, dataTypes, operationId })`
     once. Generate `operationId` before the call, and reuse it only to retry
     the identical request after a transport failure.
   - Follow progress with
     `observeSensitiveImport(operationId, { afterVersion: status.version })`:
     while the import is `running` or `applying` it resolves on the next
     change; otherwise it returns the current status at once. Call
     `cancelSensitiveImport(operationId)` if the user asks.
   - Only start shows the user an import approval; preview, observe, and cancel
     do not. The host returns aggregate status only; plaintext never enters
     Base.
6. Poll `getImportJob(jobId)` for non-sensitive jobs; call `cancelImport(jobId)`
   if the user asks.
7. Optionally call `listOpenTabs(hostId, sourceId)` and `openTabsAsPanels(...)`.
   By default this creates a new workspace root with nested collections per
   source window; use `destination: "caller"` only when the user wants the
   hierarchy attached to the calling panel. The imported subtree shares its root
   collection's orchestration context, so its collection conductors can title,
   regroup, and automate those panels without a permission prompt per tab. See
   [the collection conductor skill](../../about/collection/SKILL.md).

Sources are opaque records of installed browsers. Local profiles are merged
inside the trusted provider and never shown to userland. The preview schema
defines which categories are supported; do not assume support for settings,
extensions, or site permissions.

Non-sensitive imports commit in bounded, idempotent batches. A cancelled or
interrupted job keeps the batches already committed; starting the same source
again resumes, because batch identities are deterministic. Preview returns only
counts, masked samples, and warnings.

## Runtime data

- Use the bookmark and history methods for normal reads, writes, search, and
  deletion.
- Use `putPageFavicon` and `getPageFavicon` for page-associated browser icons;
  bytes are validated. PNG, JPEG, GIF, WebP, ICO, SVG, BMP, and AVIF are
  supported.
- Site permissions are managed by the browser-permission approval service, not
  by browser data, and are never imported.

Base has no read, CRUD, or export API for browser passwords, form-fill values,
or cookies. Importing them is a sealed host operation whose receipt contains
only counts. `openBrowserPrivacyManager(section)` opens the host's privacy
manager for a deliberate user action and returns no protected data. Never
render, log, or forward raw secrets, local files, or decrypted import batches
through the Base coordinator.
