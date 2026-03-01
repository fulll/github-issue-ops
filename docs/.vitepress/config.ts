import { defineConfig } from "vitepress";

export default defineConfig({
  title: "github-issue-ops",
  description: "Industrialize GitHub issue campaigns from code-search results",
  base: "/github-issue-ops/",

  themeConfig: {
    logo: "/logo.svg",

    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Reference", link: "/reference/create" },
      { text: "Changelog", link: "https://github.com/fulll/github-issue-ops/releases" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "How it works", link: "/guide/how-it-works" },
          ],
        },
        {
          text: "Usage",
          items: [
            { text: "issue create", link: "/guide/create" },
            { text: "issue refresh", link: "/guide/refresh" },
            { text: "issue dispatch", link: "/guide/dispatch" },
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
    },

    socialLinks: [{ icon: "github", link: "https://github.com/fulll/github-issue-ops" }],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2024 fulll",
    },
  },
});
