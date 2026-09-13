import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Amarantha",
  description: "A rich, source-preserving Markdown/MDX editor.",
  cleanUrls: true,

  head: [["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }]],

  themeConfig: {
    logo: "/logo.svg",

    nav: [
      { text: "Guide", link: "/introduction" },
      { text: "Core", link: "/core/" },
      { text: "Platforms", link: "/platforms/" },
    ],

    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "What is Amarantha?", link: "/introduction" },
          { text: "Architecture", link: "/architecture" },
        ],
      },
      {
        text: "Amarantha Core",
        items: [
          { text: "Overview", link: "/core/" },
          { text: "Source-Preserving Editing", link: "/core/source-preserving" },
          { text: "Configuration", link: "/core/configuration" },
          { text: "Config Schema Reference", link: "/core/config-schema" },
          { text: "Custom Components", link: "/core/custom-components" },
          { text: "Frontmatter", link: "/core/frontmatter" },
          { text: "Themes & Fonts", link: "/core/themes-and-fonts" },
        ],
      },
      {
        text: "Platform-Specific Features",
        items: [
          { text: "Overview", link: "/platforms/" },
          { text: "Web Demo", link: "/platforms/web" },
          { text: "Desktop App", link: "/platforms/desktop" },
          { text: "VS Code Extension", link: "/platforms/vscode" },
          { text: "Chrome Extension", link: "/platforms/chrome-extension" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/FrankFlitton/amarantha-md-editor" },
    ],

    search: {
      provider: "local",
    },
  },
});
