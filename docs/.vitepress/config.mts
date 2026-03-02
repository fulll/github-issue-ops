import { defineConfig } from "vitepress";

export default defineConfig({
  title: "github-issue-ops",
  description: "Industrialize GitHub issue campaigns from code-search results",
  base: "/github-issue-ops/",

  // "force-auto" = respect prefers-color-scheme; user can still toggle
  appearance: "force-auto",

  // ── Head ───────────────────────────────────────────────────────────────────
  head: [
    // Favicons — fulll brand assets
    ["link", { rel: "icon", type: "image/svg+xml", href: "/github-issue-ops/favicon.svg" }],
    [
      "link",
      { rel: "icon", type: "image/png", sizes: "72x72", href: "/github-issue-ops/favicon-72.png" },
    ],
    [
      "link",
      { rel: "apple-touch-icon", sizes: "114x114", href: "/github-issue-ops/apple-touch-icon.png" },
    ],
    // fulll dark blue as browser theme colour
    ["meta", { name: "theme-color", content: "#0000CC" }],
  ],

  themeConfig: {
    logo: "/logo.svg",

    nav: [
      { text: "Getting Started", link: "/getting-started/", activeMatch: "^/getting-started/" },
      { text: "Reference", link: "/reference/create", activeMatch: "^/reference/" },
      { text: "Architecture", link: "/architecture/overview", activeMatch: "^/architecture/" },
      { text: "What's New", link: "/whats-new/", activeMatch: "^/whats-new/" },
    ],

    sidebar: {
      "/getting-started/": [
        {
          text: "Getting Started",
          items: [
            { text: "Prerequisites", link: "/getting-started/" },
            { text: "Installation", link: "/getting-started/installation" },
            { text: "Quickstart", link: "/getting-started/quickstart" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "CLI Reference",
          items: [
            { text: "issue create", link: "/reference/create" },
            { text: "issue refresh", link: "/reference/refresh" },
            { text: "issue dispatch", link: "/reference/dispatch" },
          ],
        },
      ],
      "/architecture/": [
        {
          text: "Architecture",
          items: [
            { text: "Level 1 — System context", link: "/architecture/overview" },
            { text: "Level 2 — Containers", link: "/architecture/containers" },
            { text: "Level 3 — Components", link: "/architecture/components" },
          ],
        },
      ],
      "/whats-new/": [
        {
          text: "What's New",
          items: [{ text: "Releases", link: "/whats-new/#releases" }],
        },
      ],
    },

    search: {
      provider: "local",
    },

    socialLinks: [{ icon: "github", link: "https://github.com/fulll/github-issue-ops" }],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © fulll",
    },
  },
});
