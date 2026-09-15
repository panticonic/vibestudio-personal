import { useState } from "react";
import { Button, Card, Flex, Text, TextField } from "@radix-ui/themes";
import { browserData } from "@workspace/runtime";
import type { StoredSearchEngine } from "@vibestudio/browser-data";
import type { WebSearchEngineInput } from "@vibestudio/shared/webSearch";
import { AboutPage, AboutThemeRoot } from "@workspace/about-shared/ui";
import { useAsyncResource } from "@workspace/about-shared/asyncState";

const readEngines = () => browserData.getSearchEngines();
const blank: WebSearchEngineInput = {
  name: "",
  keyword: "",
  searchUrl: "",
  suggestUrl: "",
  isDefault: false,
};

export function SearchSettings() {
  const {
    data: engines = [],
    error,
    loading,
    refresh,
  } = useAsyncResource(readEngines);
  const [draft, setDraft] = useState<
    (WebSearchEngineInput & { id?: number }) | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const run = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setSaveError(null);
    try {
      await action();
      setDraft(null);
      await refresh();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };
  const edit = (engine: StoredSearchEngine) =>
    setDraft({
      id: engine.id,
      name: engine.name,
      keyword: engine.keyword ?? "",
      searchUrl: engine.search_url,
      suggestUrl: engine.suggest_url ?? "",
      isDefault: engine.is_default === 1,
    });
  return (
    <AboutPage
      title="Web Search"
      subtitle="Search providers for new panels, the command bar, and address fields."
    >
      <Flex direction="column" gap="3">
        <Text size="2" color="gray">
          Suggestions send what you type to the selected provider. Clear its
          suggestion URL to turn them off. Web addresses stay in local history
          lookup.
        </Text>
        {loading && <Text>Loading providers…</Text>}
        {(error || saveError) && (
          <Text role="alert" color="red">
            {saveError || String(error)}
          </Text>
        )}
        {engines.map((engine) => (
          <Card key={engine.id}>
            <Flex justify="between" align="center" gap="3" wrap="wrap">
              <Flex direction="column" gap="1">
                <Text weight="bold">
                  {engine.name}
                  {engine.is_default === 1 ? " · Default" : ""}
                </Text>
                <Text size="2" color="gray">
                  {engine.keyword
                    ? `Shortcut: ${engine.keyword} search terms · `
                    : ""}
                  {engine.suggest_url
                    ? "Suggestions enabled"
                    : "Suggestions off"}
                </Text>
              </Flex>
              <Flex gap="2">
                {engine.is_default !== 1 && (
                  <Button
                    disabled={saving}
                    variant="soft"
                    onClick={() =>
                      void run(() => browserData.setDefaultEngine(engine.id))
                    }
                  >
                    Make default
                  </Button>
                )}
                <Button
                  disabled={saving}
                  variant="soft"
                  onClick={() => edit(engine)}
                >
                  Edit {engine.name}
                </Button>
              </Flex>
            </Flex>
          </Card>
        ))}
        <Button
          disabled={saving}
          variant="soft"
          onClick={() => setDraft({ ...blank })}
        >
          Add provider
        </Button>
        {draft && (
          <Card>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run(() => browserData.saveSearchEngine(draft));
              }}
            >
              <Flex direction="column" gap="3">
                {(
                  [
                    ["name", "Name"],
                    ["keyword", "Keyword shortcut"],
                    ["searchUrl", "Search URL"],
                    ["suggestUrl", "Suggestion URL (optional)"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    <Text as="div" size="2">
                      {label}
                    </Text>
                    <TextField.Root
                      required={key === "name" || key === "searchUrl"}
                      value={draft[key] ?? ""}
                      onChange={(event) =>
                        setDraft({ ...draft, [key]: event.target.value })
                      }
                    />
                  </label>
                ))}
                <Text size="2" color="gray">
                  Use %s or {"{searchTerms}"} for the query. Suggestion URLs
                  must return OpenSearch JSON suggestions.
                </Text>
                <Flex gap="2">
                  <Button type="submit" disabled={saving}>
                    Save provider
                  </Button>
                  <Button
                    type="button"
                    variant="soft"
                    disabled={saving}
                    onClick={() => setDraft(null)}
                  >
                    Cancel
                  </Button>
                </Flex>
              </Flex>
            </form>
          </Card>
        )}
      </Flex>
    </AboutPage>
  );
}

export default function SearchSettingsRoot() {
  return (
    <AboutThemeRoot>
      <SearchSettings />
    </AboutThemeRoot>
  );
}
