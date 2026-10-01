// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { Theme } from "@radix-ui/themes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Downloads from "./index";

const browserData = vi.hoisted(() => ({
  listDownloads: vi.fn(),
  pauseDownload: vi.fn(),
  resumeDownload: vi.fn(),
  cancelDownload: vi.fn(),
  openDownload: vi.fn(),
  revealDownload: vi.fn(),
}));
const openPanel = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@workspace/runtime", () => ({ browserData, openPanel }));
vi.mock("@workspace/about-shared/ui", () => ({
  AboutThemeRoot: ({ children }: { children: ReactNode }) => (
    <Theme>{children}</Theme>
  ),
  AboutPage: ({
    children,
    actions,
  }: {
    children: ReactNode;
    actions: ReactNode;
  }) => (
    <main>
      {actions}
      {children}
    </main>
  ),
}));

const download = {
  id: "one",
  filename: "report.pdf",
  url: "https://example.com/report.pdf",
  state: "completed",
  receivedBytes: 2048,
  totalBytes: 2048,
};

beforeEach(() => {
  vi.resetAllMocks();
  browserData.listDownloads.mockResolvedValue([download]);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("downloads management", () => {
  it("shows download action failures and does not erase them on a successful refresh", async () => {
    vi.useFakeTimers();
    browserData.openDownload.mockRejectedValue(
      new Error("File no longer exists"),
    );
    render(<Downloads />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    await act(async () => {});
    expect(screen.getByRole("alert")).toHaveProperty(
      "textContent",
      "File no longer exists",
    );
    await act(async () => void (await vi.advanceTimersByTimeAsync(1000)));
    expect(screen.getByRole("alert")).toHaveProperty(
      "textContent",
      "File no longer exists",
    );
  });

  it("resumes a live interrupted transfer and offers a fresh link only after native ownership ends", async () => {
    browserData.listDownloads.mockResolvedValue([
      { ...download, state: "interrupted", canResume: true },
    ]);
    const view = render(<Downloads />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    await act(async () => {});
    expect(browserData.resumeDownload).toHaveBeenCalledWith("one");
    expect(openPanel).not.toHaveBeenCalled();
    view.unmount();
    browserData.listDownloads.mockResolvedValue([
      { ...download, state: "interrupted", canResume: false },
    ]);
    render(<Downloads />);
    await act(async () => {});
    expect(screen.queryByRole("button", { name: "Resume" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open download link" }));
    await act(async () => {});
    expect(openPanel).toHaveBeenCalledWith(download.url);
  });

  it("waits for download reads to settle before polling and stops polling on unmount", async () => {
    vi.useFakeTimers();
    let resolve!: (rows: (typeof download)[]) => void;
    browserData.listDownloads.mockReturnValue(
      new Promise((done) => (resolve = done)),
    );
    const { unmount } = render(<Downloads />);
    expect(screen.getByRole("status").textContent).toContain(
      "Loading downloads",
    );
    expect(screen.queryByText("No browser downloads yet.")).toBeNull();
    await act(async () => void (await vi.advanceTimersByTimeAsync(5000)));
    expect(browserData.listDownloads).toHaveBeenCalledOnce();
    unmount();
    await act(async () => {
      resolve([]);
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(browserData.listDownloads).toHaveBeenCalledOnce();
  });
});
