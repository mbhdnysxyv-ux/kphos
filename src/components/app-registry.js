export const appRegistry = [
  {
    id: "finder",
    title: "Finder",
    icon: "🧭",
    accent: "#58a6ff",
    content: `
      <section class="app-pane">
        <h2>Recents</h2>
        <ul>
          <li>Projects</li>
          <li>Design Assets</li>
          <li>Documents</li>
        </ul>
      </section>
      <section class="app-pane">
        <h2>Sidebar</h2>
        <ul>
          <li>AirDrop</li>
          <li>Applications</li>
          <li>Desktop</li>
          <li>Downloads</li>
        </ul>
      </section>
    `
  },
  {
    id: "safari",
    title: "Safari",
    icon: "🧿",
    accent: "#4ecdc4",
    content: `
      <div class="browser-shell">
        <div class="browser-bar">Search or enter website name</div>
        <div class="browser-body">
          <h2>Start Page</h2>
          <p>Privacy report, favorites, and reading list placeholders.</p>
        </div>
      </div>
    `
  },
  {
    id: "notes",
    title: "Notes",
    icon: "🗒️",
    accent: "#ffd166",
    content: `
      <article class="note-body">
        <h2>Project Notes</h2>
        <p>- Rebuild all spacing tokens from native screenshots.</p>
        <p>- Align blur, corner radius and shadows to system specs.</p>
      </article>
    `
  },
  {
    id: "settings",
    title: "Settings",
    icon: "⚙️",
    accent: "#9ca3af",
    content: `
      <section class="settings-grid">
        <div>Apple Account</div>
        <div>Wi-Fi</div>
        <div>Bluetooth</div>
        <div>Appearance</div>
        <div>Control Center</div>
        <div>Wallpaper</div>
      </section>
    `
  }
];
