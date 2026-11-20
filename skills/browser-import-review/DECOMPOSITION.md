# Browser migration review

The caller assigns an opaque source selected in the Browser Import Inspector and, for a recovery review, the specific existing import receipt. The shared workflow reviews that assignment through the installed Browser Data extension.

| Responsibility | Natlang stages | Runtime adapter |
| --- | --- | --- |
| Review a selected source | Check host availability, source readability, and all requested categories before asking for a preview. | Resolve only the assigned host and source. Return the readiness and public categories. |
| Explain the preview | Compare reported category totals with the assigned selection and surface warnings or incomplete coverage. | Request the exact caller-selected categories and project only aggregate totals. |
| Recover an interrupted import | Interpret the existing receipt before deciding whether to wait, report completion, keep committed results, or recheck the original source. | Read only the assigned job. Verify it belongs to the same source and categories. |
| Review a possible retry | Recheck the original source and its categories. Keep previous progress and route to the inspector when the original source is unavailable. | Expose a fresh read of the assigned source without starting or cancelling import jobs. |

The preview and recovery reports advise the caller through the same inspector that owns migration. They carry counts, the number of preview warnings, and the next action. Host and source identity, profile data, preview samples, and sealed transfers stay inside the extension.
