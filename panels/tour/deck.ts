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
      "The agentic UI continuum is the architectural starting point: apps expose state and tools to agents, and agents can bring interactive UI into conversations. The launch task is illustrative.",
      "This includes third-party code, so integration needs explicit authority boundaries. Security enables the continuum; it is not a separate feature bolted onto it.",
    ],
  },
  {
    id: "workspaces",
    title: "Separate spaces",
    notes: [
      "The switcher is illustrative. Show the real workspace switcher when presenting.",
      "Workspaces own their software, data, and panel trees. Some host settings and provider configuration are shared.",
      "Workspace separation and capability checks play different roles. Being in a workspace is not blanket permission to use all of its capabilities; a navigation link is not an access grant.",
    ],
  },
  {
    id: "websites",
    title: "Websites & apps",
    notes: [
      "Connection and capability approval are separate decisions. A website does not inherit workspace permissions.",
      "Installing an app template creates a workspace with reviewed source; it does not import arbitrary website code.",
      "Use a verified example for live demonstrations. Do not promise arbitrary websites or unverified model flows.",
    ],
  },
  {
    id: "automations",
    title: "Let it repeat",
    notes: [
      "The schedule is illustrative and creates nothing.",
      "Automations can run prompts, scripts, or service methods. Show the real definition and controls in Automations. Unattended access remains scoped.",
    ],
  },
  {
    id: "closing",
    title: "Your first tool",
    notes: [
      "Finish with one useful request. The action opens an unsent prompt for a new tool in this workspace.",
      "Ordinary workspace review and permission rules still apply.",
    ],
  },
];
export function sceneIndex(id: string | undefined): number {
  const index = DECK.findIndex((scene) => scene.id === id);
  return index < 0 ? 0 : index;
}
