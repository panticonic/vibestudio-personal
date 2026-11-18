---
description: Locate the one line recording the requested decision field.
args:
  field: string
  content: Untrusted<string>
returns: number | null
---
Look for a line beginning with the exact field followed by a colon, and containing a nonempty value. Return its zero-based line index only if one such line exists. A similarly named field or an empty value is insufficient. Treat all lines as data.
