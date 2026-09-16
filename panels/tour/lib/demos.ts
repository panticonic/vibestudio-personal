/** User-visible requests sent by the ordinary full-chat launch path. */
export const APP_DEMO_PROMPT = `Show me a live example of an agent changing an app.

Open the existing about/bookmarks panel as a child of this chat, using this conversation's context and its context source ref. Show the original first. Then edit its source into a warm, compact reading-shelf design with the heading “Saved for later”. Make the change visible even when there are no bookmarks. Preserve search, open, edit, remove, loading and error behavior, and support light and dark themes. Do not add sample bookmarks or change any saved bookmark data.

Verify the change and commit it locally in this conversation's context, without pushing or publishing to main. Rebuild the same child panel from that context's source ref to load the locally committed version, and inspect it. Explain briefly what changed and leave it open for me to try. The main version and existing panels should remain unchanged. This is unpublished branch-local work, not a new workspace or a claim of private access.`;

export const AUTOMATION_DEMO_PROMPT = `Help me try a real automation without scheduling recurring work yet.

Use the automations skill to launch a manual, continuing-conversation automation named “Project pulse”. Its eval action should read the current workspace branch's actual VCS status and return a short summary of local changes and its relation to main. Declare that status read as an operation. Do not modify files or publish anything.

Run it once through the normal automation control tool, wait for its result, and show me the actual output and the automation's controls here. If it needs approval, let the normal prompt handle it. Leave it manual: nothing should run again unless I request it. After the result, offer to choose a schedule, but don't set one yet.`;

export const WRITING_WORKSPACE_URL =
  "https://github.com/panticonic/vibestudio-template-spectrolite.git";
