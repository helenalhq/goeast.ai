// @vitest-environment jsdom
import React, { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AuthRetryableFetchError, AuthSessionMissingError } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PricingClient from "./pricing-client";

const { createClient, getUser } = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({ createClient }));
vi.mock("@/lib/use-upgrade-button", () => ({
  useUpgradeButton: () => ({ loading: false, error: null, handleUpgrade: vi.fn() }),
}));

const guest = { data: { user: null }, error: new AuthSessionMissingError() };
const signedIn = { data: { user: { email: "test@example.invalid" } }, error: null };

describe("PricingClient session check", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    createClient.mockReset().mockReturnValue({ auth: { getUser } });
    getUser.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function expectRecovery() {
    expect(screen.getByRole("alert").textContent).toContain("check your sign-in status");
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign in to upgrade" }).getAttribute("href")).toBe("/login?next=/pricing");
    expect(screen.queryByRole("button", { name: "Upgrade to Pro" })).toBeNull();
  }

  it("keeps a missing session on the regular guest path", async () => {
    getUser.mockResolvedValueOnce(guest);
    render(<PricingClient paymentEnabled />);
    expect(await screen.findByRole("link", { name: "Sign in to upgrade" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("offers recovery on a resolved transient error and renders checkout after retry succeeds", async () => {
    getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new AuthRetryableFetchError("auth API unavailable", 503),
    }).mockResolvedValueOnce(signedIn);
    render(<PricingClient paymentEnabled />);
    await screen.findByRole("link", { name: "Sign in to upgrade" });
    expectRecovery();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("button", { name: "Upgrade to Pro" })).toBeTruthy();
    expect(getUser).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("offers recovery if auth rejects", async () => {
    getUser.mockRejectedValueOnce(new Error("offline"));
    render(<PricingClient paymentEnabled />);
    await screen.findByRole("alert");
    expectRecovery();
  });

  it("offers recovery if creating the client throws synchronously", async () => {
    createClient.mockImplementationOnce(() => { throw new Error("client unavailable"); });
    render(<PricingClient paymentEnabled />);
    await screen.findByRole("alert");
    expectRecovery();
  });

  it("times out a hanging check and ignores its late result after a successful retry", async () => {
    vi.useFakeTimers();
    let finishFirst!: (value: typeof guest) => void;
    getUser.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }))
      .mockResolvedValueOnce(signedIn);
    render(<PricingClient paymentEnabled />);
    expect(screen.getByText("Loading...")).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expectRecovery();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry" })); });
    expect(screen.getByRole("button", { name: "Upgrade to Pro" })).toBeTruthy();
    await act(async () => { finishFirst(guest); });
    expect(screen.getByRole("button", { name: "Upgrade to Pro" })).toBeTruthy();
  });

  it("ignores work from React's cleaned-up effect and clears the current timeout on unmount", async () => {
    vi.useFakeTimers();
    let finishFirst!: (value: typeof guest) => void;
    getUser.mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }))
      .mockImplementationOnce(() => new Promise(() => {}));
    const { unmount } = render(<StrictMode><PricingClient paymentEnabled /></StrictMode>);
    await act(async () => { finishFirst(guest); });
    expect(screen.getByText("Loading...")).toBeTruthy();
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not look up a session when payments are disabled", () => {
    render(<PricingClient paymentEnabled={false} />);
    expect(screen.getByText("Coming soon")).toBeTruthy();
    expect(createClient).not.toHaveBeenCalled();
  });
});
