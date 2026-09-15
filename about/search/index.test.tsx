// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { SearchSettings } from "./index";

const api = vi.hoisted(() => ({
  getSearchEngines: vi.fn(),
  setDefaultEngine: vi.fn(),
  saveSearchEngine: vi.fn(),
}));
vi.mock("@workspace/runtime", () => ({ browserData: api }));
vi.mock("@workspace/about-shared/ui", () => ({
  AboutPage: ({ children }: { children: ReactNode }) => <main>{children}</main>,
  AboutThemeRoot: ({ children }: { children: ReactNode }) => children,
}));

describe("search settings", () => {
  it("selects a provider and saves a custom provider with suggestions disabled", async () => {
    api.getSearchEngines.mockResolvedValue([
      {
        id: 1,
        name: "Google",
        keyword: "g",
        search_url: "https://www.google.com/search?q=%s",
        suggest_url: null,
        is_default: 0,
      },
    ]);
    api.setDefaultEngine.mockResolvedValue(undefined);
    api.saveSearchEngine.mockResolvedValue(2);
    render(<SearchSettings />);
    fireEvent.click(await screen.findByText("Make default"));
    await waitFor(() => expect(api.setDefaultEngine).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(screen.getByText("Add provider").hasAttribute("disabled")).toBe(
        false,
      ),
    );
    fireEvent.click(screen.getByText("Add provider"));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "My search" },
    });
    fireEvent.change(screen.getByLabelText("Search URL"), {
      target: { value: "https://search.test/?q=%s" },
    });
    fireEvent.click(screen.getByText("Save provider"));
    await waitFor(() =>
      expect(api.saveSearchEngine).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "My search",
          searchUrl: "https://search.test/?q=%s",
          suggestUrl: "",
        }),
      ),
    );
  });
});
