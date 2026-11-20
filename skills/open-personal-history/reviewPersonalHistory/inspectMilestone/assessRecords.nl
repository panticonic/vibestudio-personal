---
description: Resolve authority and make line-accurate citations from immutable historical files.
args:
  milestone: Milestone
  field: string
  goal: string
  files: Source[]
returns: Finding
---
1. Identify the field as an exact heading or entry. Respect each record's declared authority. An approved record can establish a value. A draft or appendix cannot replace it. A formal withdrawal for the field supersedes prior approval at the same milestone. A blank or missing approved entry does not establish a value.
2. For verified or withdrawn, cite the exact establishing line. For conflicting approved values, cite the contradictory lines. If no authorized record establishes the value or withdraws it, return missing and no citations.
3. Use each source's actual event ID, path, content hash, one-based line number, and verbatim line. Return the milestone's exact label.
