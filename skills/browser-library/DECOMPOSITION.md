# Live browser library

The core operation organizes saved browser references. A requested title or URL
identifies the workspace's own browser records, and recovery can use recent
history when the user has lost track of a link. Each operation verifies the
actual browser store before the next operation uses the result.

| Responsibility | Natlang stages | Runtime adapter |
| --- | --- | --- |
| Find references | Resolve an exact URL or title within the requested folder. Hold ambiguous references. | Read bookmark folders and history through the Browser Data service. |
| Recover a visited link | Choose the unique most recent matching URL. Check the destination for an existing bookmark before saving. | Apply a write against an observed browser-library snapshot. |
| Curate saved references | Rename, file or retire an identified bookmark. For retirement, require a confirmed copy of the same URL. | Use the store's stable record ID and verify the allowed folders. |
| Verify the result | Check the new bookmark, the changed original or the retained copy against both observations. | Read the persisted rows after each write. |
