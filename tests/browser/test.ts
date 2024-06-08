import { expect, test } from "@playwright/test";
import type { TestDone, TestGlobal } from "./setup.ts";

const TEST_DONE: TestDone = "test-done";

test("run tests", async ({ page }) => {
  const res = await page.goto("./");
  expect(res?.ok()).toBe(true);
  expect(await page.$eval("title", (e) => e.textContent)).toBe("Browser Tests");

  await page.waitForEvent("console", async (msgs) => {
    const args = await Promise.all(msgs.args().map((v) => v.jsonValue()));
    if (args[0] === TEST_DONE) {
      return true;
    }
    console.log(...args);
    return false;
  });

  const testResult = await page.evaluate(() =>
    (globalThis as TestGlobal).testResult
  );
  expect(testResult).toMatchObject({ errors: 0 });
});
