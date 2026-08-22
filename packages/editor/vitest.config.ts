import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    // globals:true so @testing-library/react's automatic afterEach(cleanup)
    // detection kicks in and DOM doesn't leak between tests in a file.
    globals: true,
  },
});
