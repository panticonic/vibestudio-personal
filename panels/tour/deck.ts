/** Scene ids are persisted panel state. */
export interface SceneMeta {
  id: string;
  title: string;
  notes: string[];
}
export const DECK: readonly SceneMeta[] = [
  {
    id: "opening",
    title: "Make it yours",
    notes: [
      "This tour is an editable workspace panel. The action opens an unsent Quickfire request.",
      "On desktop, selecting text and choosing Ask about also opens the panel's agent.",
    ],
  },
  {
    id: "continuum",
    title: "Apps meet agents",
    notes: [
      "The agentic UI continuum is the architectural starting point: apps expose state and tools to agents, and agents can bring interactive UI into conversations. Drag the slider: the reading list becomes an inline control, retaining its checkmark across positions. The articles and agent replies are illustrative, not live recommendations.",
      "This includes third-party code, so integration needs explicit authority boundaries. Security enables the continuum; it is not a separate feature bolted onto it.",
      "The live action opens a full child chat and sends a source-editing request. The agent opens existing about/bookmarks in that conversation's context, edits and commits locally without publishing, then rebuilds the same child from its context ref. Unpublished is not a separate security boundary; bookmark data is not copied or modified.",
    ],
  },
  {
    id: "workspaces",
    title: "Capabilities & security",
    notes: [
      "Lead with rich environments for mutually untrusted code and agents, including third-party workspace templates—not personal organization. The three views distinguish workspace separation, resource-specific capabilities, and host-enforced approval. The reading-list capability is an example, not a built-in grant.",
      "Workspaces own their software, data, and panel trees. Some host settings and provider configuration are shared.",
      "Workspace separation and capability checks play different roles. Being in a workspace is not blanket permission to use all of its capabilities; a navigation link is not an access grant.",
      "Open methods need no grant; gated methods require matching authority; critical methods require fresh approval. Version grants bind exact executing code, so source changes invalidate them. These are runtime authority boundaries, not a claim that native code has no host OS access.",
      "Who approves? includes a live, read-only sample. Installed panels use version grants, not website session grants. Repeat the same call: a version grant can be reused, while allow-once prompts again. Install approval may already cover it. Denial is valid; never clear permissions just to force a demonstration.",
    ],
  },
  {
    id: "websites",
    title: "Websites & apps",
    notes: [
      "Connection and capability approval are separate decisions. A website does not inherit workspace permissions.",
      "Installing an app template creates a workspace with reviewed source; it does not import arbitrary website code.",
      "Try a writing workspace opens the ordinary source-review surface for Spectrolite. The link neither creates a workspace nor grants access. The user reviews the exact source and decides whether to proceed.",
    ],
  },
  {
    id: "automations",
    title: "Let it repeat",
    notes: [
      "Run a project pulse opens a full child chat and sends a request to launch a manual continuing automation and run it once. It reads actual branch status, not a simulated result. The ordinary automation pill owns results, history and controls. Recurrence requires a later explicit request.",
      "Automations can run prompts, scripts, or service methods. Show the real definition and controls in Automations. Unattended access remains scoped.",
    ],
  },
  {
    id: "closing",
    title: "Your first tool",
    notes: [
      "Finish with one useful request. The action opens a new root chat panel in this workspace and sends its initial prompt on connection. It does not use the tour's Quickfire conversation.",
      "Ordinary workspace review and permission rules still apply.",
    ],
  },
];
export function sceneIndex(id: string | undefined): number {
  const index = DECK.findIndex((scene) => scene.id === id);
  return index < 0 ? 0 : index;
}
