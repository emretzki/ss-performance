import { defineConfig, devices } from "@playwright/test";

// Mock mode only — no Supabase env vars, so the app falls back to the
// localStorage-backed mock store (see src/lib/mockStore.ts). Fast, free,
// deterministic, and doesn't touch the live project.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5183",
    trace: "retain-on-failure",
    // mockStore.ts builds fixture session times off local-time Date methods
    // (setHours), same as the app's own "today" logic. Pinning the browser's
    // timezone keeps that mapping from local hour to UTC instant identical
    // wherever the suite runs — without this, a CI runner (typically UTC)
    // and a dev machine in another zone would seed the "same" 09:00 fixture
    // session at different absolute instants, silently breaking any test
    // whose pinned clock (see e2e/helpers.ts) was tuned against one zone.
    timezoneId: "Europe/Istanbul",
  },
  webServer: {
    command: "npm run dev -- --port 5183",
    url: "http://localhost:5183",
    reuseExistingServer: !process.env.CI,
    env: { VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "" },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
