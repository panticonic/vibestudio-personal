# Tour rehearsal in Natlang

| Responsibility | Implementation |
|---|---|
| Read ordered scenes and titles | The tour's existing deck registry |
| Read assigned panel args and actual scene, footer and notes | TypeScript over the panel handle and CDP |
| Resolve the requested topics to authorized stops | Nested Natlang planning |
| Choose the notes state for each stop | Natlang planning from the presenter's request |
| Apply one allowed scene and notes update and read it back | TypeScript using the tour’s native keyboard controls and persisted state |
| Decide whether the visible scene and persisted args agree with the stop | Natlang readback assessment |
| Stop at a disagreement and restore the opening position when requested | Natlang sequencing and restoration verification |

The caller owns the panel and supplies the allowable scenes. The rehearsal
uses scene and notes controls only. The sample approval, app-editing,
workspace creation and automation demos stay under their normal user controls.

An absent or retired scene ID resolves to the first scene, as it does in the panel.
