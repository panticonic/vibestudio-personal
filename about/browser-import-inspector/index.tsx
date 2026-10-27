/** Import browser data; ongoing management lives in Settings → Browser data. */
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Callout,
  Flex,
  Heading,
  Text,
  Theme,
} from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "@workspace/ui/foundation.css";
import "@workspace/ui/themes/vibestudio.css";
import {
  useIsMobile,
  usePanelTheme,
  usePanelThemeConfig,
} from "@workspace/react";
import {
  ImportSourceRail,
  type ImportSourceSelection,
} from "./components/ImportSourceRail";
import { MigrateTab } from "./components/MigrateTab";
import { browserData } from "./useBrowserData";

function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function BrowserImportInspector() {
  const theme = usePanelTheme();
  const appTheme = usePanelThemeConfig();
  const isMobile = useIsMobile();
  const now = useNow();
  const [selection, setSelection] = useState<ImportSourceSelection | null>(
    null,
  );
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const openSettings = async () => {
    setSettingsError(null);
    try {
      await browserData.openBrowserDataSettings("siteData");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : String(error));
    }
  };
  return (
    <Theme appearance={theme} {...appTheme}>
      <Flex
        direction={isMobile ? "column" : "row"}
        style={{ height: "100dvh", width: "100%" }}
      >
        <ImportSourceRail selected={selection} onSelect={setSelection} />
        <Flex direction="column" style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <Flex align="center" justify="between" gap="3" p="4" wrap="wrap">
            <Heading size="3">Browser import</Heading>
            <Button variant="soft" onClick={() => void openSettings()}>
              Site data in Settings
            </Button>
          </Flex>
          {settingsError && (
            <Callout.Root color="red" mx="4" mb="3">
              <Callout.Text>{settingsError}</Callout.Text>
            </Callout.Root>
          )}
          {selection?.source.warnings.map((warning) => (
            <Callout.Root color="amber" mx="4" mb="3" key={warning}>
              <Callout.Text>{warning}</Callout.Text>
            </Callout.Root>
          ))}
          <Box style={{ flex: 1, minHeight: 0 }}>
            {selection ? (
              <MigrateTab selection={selection} now={now} />
            ) : (
              <Flex align="center" justify="center" style={{ height: "100%" }}>
                <Text size="2" color="gray">
                  Choose a device and browser to plan an import.
                </Text>
              </Flex>
            )}
          </Box>
        </Flex>
      </Flex>
    </Theme>
  );
}
