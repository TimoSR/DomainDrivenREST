import { expect, test } from "@playwright/test";

test("directory filters by method and feature and recovers from empty results", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "API workspace", exact: true })).toBeVisible();
  await page.getByLabel("Filter by feature").selectOption("Customers");
  await expect(page.locator("button.directory-row")).toHaveCount(3);
  await page.getByLabel("Search endpoints").fill("POST");
  await expect(page.locator("button.directory-row")).toHaveCount(1);
  await page.getByLabel("Search endpoints").fill("not-a-route");
  await expect(page.getByText("No matching results")).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.locator("button.directory-row")).toHaveCount(8);
});

test("sends a real sample request and records history with local editor assets", async ({ page }) => {
  const externalRequests: string[] = [];
  const errors: string[] = [];
  page.on("request", r => { if (!r.url().startsWith("http://localhost:") && !r.url().startsWith("data:")) externalRequests.push(r.url()); });
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("./");
  await page.getByRole("button", { name: "Compose a request" }).click();
  await page.getByRole("button", { name: "Fill with sample data" }).click();
  await expect(page.locator(".monaco-editor").first()).toBeVisible();
  await expect(page.getByText(/^Valid against/)).toBeVisible();
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.locator(".resp-stats .status")).toContainText("201 Created");
  await page.getByRole("button", { name: /History/ }).click();
  await expect(page.getByRole("heading", { name: "Request history", exact: true })).toBeVisible();
  await expect(page.locator("button.directory-row")).toHaveCount(1);
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("missing parameters are explained before sending", async ({ page }) => {
  await page.goto("./");
  await page.locator("button.directory-row").filter({ hasText: "GET" }).filter({ hasText: "/api/orders/{id}" }).click();
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Complete required parameters: id.")).toBeVisible();
});

test("failed validation never displays a successful server check", async ({ page }) => {
  await page.route("**/api/validate", route => route.fulfill({ status: 503, body: "Unavailable" }));
  await page.goto("./");
  await page.getByRole("button", { name: "Compose a request" }).click();
  await page.getByRole("button", { name: "Fill with sample data" }).click();
  await expect(page.getByText("Server validation pending or unavailable")).toBeVisible();
  await expect(page.getByText(/^Valid against/)).toHaveCount(0);
});

test("duplicate keyboard sends are blocked and the request can be cancelled", async ({ page }) => {
  let count = 0;
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/orders", async route => {
    count++;
    await pending;
    await route.fulfill({ json: [] }).catch(() => {});
  });
  await page.goto("./");
  await page.locator("button.directory-row").first().click();
  await page.keyboard.press("Control+Enter");
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeVisible();
  await page.keyboard.press("Control+Enter");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText(/Request cancelled/)).toBeVisible();
  release();
  expect(count).toBe(1);
});

test("mobile layout, theme persistence, and keyboard palette", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "API workspace", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("textbox", { name: "Search workspace", exact: true }).fill("customers");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.screenshot({ path: "workspace-mobile.png", fullPage: true });
});

test("drafts survive navigation and malformed JSON prevents sending", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Compose a request" }).click();
  await page.getByLabel("customerName", { exact: true }).fill("Persistent draft");
  await page.getByRole("button", { name: "DomainDrivenRest home" }).click();
  await page.getByRole("button", { name: "Compose a request" }).click();
  await expect(page.getByLabel("customerName", { exact: true })).toHaveValue("Persistent draft");
  await page.locator(".monaco-editor .view-lines").first().click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("{ invalid json");
  await expect(page.getByText("JSON syntax error", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send request" })).toBeDisabled();
});

test("malformed local history cannot crash the workspace", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("ddr.history", '[null, {"id":1}]'));
  await page.goto("./");
  await page.getByRole("button", { name: /History/ }).click();
  await expect(page.getByText("Your first request starts here")).toBeVisible();
});
