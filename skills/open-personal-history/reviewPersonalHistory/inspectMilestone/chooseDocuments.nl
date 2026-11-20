---
description: Choose committed records that can verify, contradict or withdraw the requested field.
args:
  field: string
  goal: string
  paths: string[]
returns: string[]
---
Select the listed paths that could contain the requested decision, including a countersignature, active decision, earlier draft, or withdrawal when the directory suggests one. Ignore unrelated administrative and maintenance records. Use exact listed paths.
