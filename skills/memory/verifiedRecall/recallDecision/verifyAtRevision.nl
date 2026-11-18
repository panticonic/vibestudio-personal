---
description: Read the immutable decision file and cite a matching field when present.
args:
  lead: DecisionLead
  field: string
returns: DecisionReport
---
1. Call readDecisionFile(lead.id). If the source is missing, return missing-source with the selected lead id and null citation.
2. Call locateField with the original field and file.text. Give the returned line index, field, and original file to quoteLine.cite to copy the exact matching line.
3. Return verified with that citation or missing-field when there is no matching line. Keep the original lead id.
