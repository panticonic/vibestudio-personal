import { buildPanelLink } from "@workspace/runtime";

/** No effects on render: the host handles navigation and chat sends on connection. */
export function DemoChatLink({
  title,
  prompt,
  label,
  hint,
}: {
  title: string;
  prompt: string;
  label: string;
  hint: string;
}) {
  return (
    <div className="tour-action">
      <a
        className="btn tour-link"
        href={buildPanelLink("panels/chat", {
          disposition: "child",
          placement: { disposition: "side-if-room" },
          title,
          stateArgs: { initialPrompt: prompt },
        })}
      >
        {label}
      </a>
      <p className="box__sub">{hint}</p>
    </div>
  );
}
