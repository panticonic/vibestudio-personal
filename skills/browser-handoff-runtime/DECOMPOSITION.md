# Browser reference handoff

The shared Natlang workflow interprets the goal and orders two installed skill
trees. Browser library resolves, curates, and verifies saved references.
Collection conductor resolves the assigned panel and persists the handoff note.
The collection service checks that the assigned bookmark is present in the
verified browser-store readback before opening the write phase. The outcome
oracle compares both reports with fresh VibeStudio state and checks that the
note contains the exact URL of the retained bookmark.
