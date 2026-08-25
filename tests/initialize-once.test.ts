import { describe, expect, it, vi } from "vitest";
import { createRetryableInitializer } from "../src/handler/initialize-once";

describe("createRetryableInitializer", () => {
  it("shares one in-flight initialization across concurrent callers", async () => {
    let finishInitialization!: () => void;
    const initializationGate = new Promise<void>((resolve) => {
      finishInitialization = resolve;
    });
    const initialize = vi.fn(async () => {
      await initializationGate;
      return { ready: true };
    });
    const getInitializedValue = createRetryableInitializer(initialize);

    const first = getInitializedValue();
    const second = getInitializedValue();

    expect(initialize).toHaveBeenCalledTimes(1);

    finishInitialization();

    const [firstValue, secondValue] = await Promise.all([first, second]);
    expect(firstValue).toBe(secondValue);
  });

  it("retries after an initialization failure", async () => {
    const value = { ready: true };
    const initialize = vi
      .fn<() => Promise<typeof value>>()
      .mockRejectedValueOnce(new Error("initialization failed"))
      .mockResolvedValueOnce(value);
    const getInitializedValue = createRetryableInitializer(initialize);

    await expect(getInitializedValue()).rejects.toThrow(
      "initialization failed",
    );
    await expect(getInitializedValue()).resolves.toBe(value);
    expect(initialize).toHaveBeenCalledTimes(2);
  });
});
