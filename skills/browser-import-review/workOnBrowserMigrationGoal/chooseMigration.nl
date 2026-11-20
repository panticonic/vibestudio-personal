---
description: Decide which owned browser profile and public categories the user's goal permits.
args:
  goal: string
  catalog: MigrationCatalog
returns: 'MigrationChoice | null'
---
Use the actual profile name and device to resolve one source. Distinguish preview, executing an already approved selection, and recovering retained results. Choose only the categories requested or explicitly approved for the chosen operation. For a retained receipt preserve its recorded categories. Do not expand a partial approval to the rest of a profile. Return null when the evidence does not identify one appropriate source.
