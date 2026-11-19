---
description: Plan a bounded diagnostic, exercise two real workspace stores and classify the observed contract.
args:
  request: TextProbeRequest
returns: TextProbeReport
---
1. Call explorerTextProbe.input with the assigned operationId.
2. Call planProbe with request.goal and that input before running any effect.
3. Call explorerTextProbe.run with the same operationId and the exact plan. Call classifyProbe with the input, plan and receipt unchanged.
4. Call chooseNext with the assessment and plan. Return the exact input, plan, receipt, assessment and next.
