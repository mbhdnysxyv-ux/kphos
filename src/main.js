import { appRegistry } from "./components/app-registry.js";

const DESKTOP_ICON_WIDTH = 92;
const DESKTOP_ICON_HEIGHT = 96;
const DESKTOP_GRID_ORIGIN = { x: 72, y: 64 };
const DESKTOP_GRID_STEP = { x: 110, y: 106 };

const initialDesktopItems = [
  { id: "macintosh-hd", label: "Macintosh HD", icon: "🖴", appId: "finder", gridX: 0, gridY: 0 },
  { id: "projects", label: "Projects", icon: "📁", appId: "finder", gridX: 0, gridY: 1 },
  { id: "screenshots", label: "Screenshots", icon: "🗂️", appId: "finder", gridX: 0, gridY: 2 },
  { id: "quick-notes", label: "Quick Notes", icon: "📝", appId: "notes", gridX: 1, gridY: 0 },
  { id: "web-links", label: "Links", icon: "🌐", appId: "safari", gridX: 1, gridY: 1 }
];

const safariPresets = [
  "macOS Tahoe design resources",
  "Open source release checklist",
  "System animation timing guide"
];

const notesPresets = [
  "Rebuild spacing tokens from native screenshots.",
  "Audit blur strength on side panels and menu bar.",
  "Ship an interactive prototype before Friday review."
];

const settingsSections = [
  "Apple Account",
  "Wi-Fi",
  "Bluetooth",
  "Appearance",
  "Control Center",
  "Wallpaper"
];

const appDefaults = {
  finder: { width: 980, height: 620, x: 86, y: 76 },
  safari: { width: 920, height: 610, x: 138, y: 98 },
  notes: { width: 720, height: 560, x: 212, y: 118 },
  settings: { width: 840, height: 620, x: 168, y: 92 }
};

const initialFileSystem = {
  id: "desktop",
  name: "Desktop",
  type: "folder",
  children: [
    {
      id: "projects-dir",
      name: "Projects",
      type: "folder",
      children: [
        { id: "ui-rebuild", name: "UI Rebuild.md", type: "file", appId: "notes" },
        { id: "open-source", name: "Open Source Sync.md", type: "file", appId: "notes" },
        {
          id: "references",
          name: "References",
          type: "folder",
          children: [
            { id: "animation-guide", name: "Animation Guide.url", type: "file", appId: "safari" },
            { id: "design-system", name: "Design System.url", type: "file", appId: "safari" }
          ]
        }
      ]
    },
    {
      id: "screenshots-dir",
      name: "Screenshots",
      type: "folder",
      children: [
        { id: "screen-01", name: "Desktop 01.png", type: "file", appId: "finder" },
        { id: "screen-02", name: "Desktop 02.png", type: "file", appId: "finder" }
      ]
    },
    {
      id: "notes-dir",
      name: "Quick Notes",
      type: "folder",
      children: [{ id: "ship-list", name: "Ship Checklist.md", type: "file", appId: "notes" }]
    },
    {
      id: "links-dir",
      name: "Links",
      type: "folder",
      children: [
        { id: "openai-docs", name: "Developer Docs.url", type: "file", appId: "safari" },
        { id: "release-plan", name: "Release Plan.url", type: "file", appId: "safari" }
      ]
    }
  ]
};

let fileSystem = JSON.parse(JSON.stringify(initialFileSystem));

const STORAGE_KEY = "kphos.macos.tahoe.web.state.v1";
const WINDOW_ANIMATION_MS = {
  open: 220,
  close: 180,
  minimize: 220,
  restore: 220
};
const FULLSCREEN_BOUNDS = {
  top: 42,
  left: 12,
  right: 12,
  bottom: 110
};

const menuDefinitions = [
  { id: "apple", label: "" },
  { id: "app", label: "" },
  { id: "file", label: "File" },
  { id: "edit", label: "Edit" },
  { id: "view", label: "View" },
  { id: "window", label: "Window" },
  { id: "help", label: "Help" }
];

const state = {
  now: new Date(),
  startup: {
    active: true,
    progress: 0
  },
  session: {
    locked: true,
    password: "macostahoe",
    unlockInput: "",
    unlockError: ""
  },
  desktopItems: initialDesktopItems.map((item) => ({
    ...item,
    x: DESKTOP_GRID_ORIGIN.x + item.gridX * DESKTOP_GRID_STEP.x,
    y: DESKTOP_GRID_ORIGIN.y + item.gridY * DESKTOP_GRID_STEP.y
  })),
  selectedDesktopIds: [],
  selectedWindowId: null,
  nextWindowId: 1,
  nextNotificationId: 3,
  zCounter: 10,
  openMenu: null,
  menuTracking: false,
  menuClickGuard: false,
  openOverlay: null,
  switcherVisible: false,
  switcherIndex: 0,
  missionControl: false,
  missionControlPhase: "idle",
  windows: [],
  dockHoverAppId: null,
  minimizingAppId: null,
  desktopSelectionRect: null,
  contextMenu: null,
  snapPreview: null,
  controlCenter: {
    wifi: true,
    bluetooth: false,
    airdrop: true,
    stageManager: false,
    brightness: 75,
    sound: 40
  },
  notifications: [
    { id: "1", title: "Calendar", body: "Design review in 25 minutes." },
    { id: "2", title: "Reminders", body: "Push today's open-source sync by 18:00." }
  ],
  safari: {
    query: safariPresets[0],
    visited: safariPresets[0],
    history: [safariPresets[0]]
  },
  notes: {
    text: notesPresets.join("\n"),
    autosavedAt: new Date()
  },
  settings: {
    selected: "Appearance"
  },
  finder: {
    currentFolderId: "desktop",
    selectedEntryId: "projects-dir",
    editingEntryId: null,
    editingName: "",
    history: ["desktop"],
    historyIndex: 0,
    searchQuery: "",
    sortMode: "name-asc",
    viewMode: "list"
  }
};

let persistTimer = null;
let missionControlTimer = null;
const windowAnimationTimers = new Map();

function persistState() {
  try {
    const snapshot = {
      desktopItems: state.desktopItems,
      controlCenter: state.controlCenter,
      notifications: state.notifications,
      safari: state.safari,
      notes: state.notes,
      settings: state.settings,
      finder: state.finder,
      windows: state.windows.map((item) => ({
        ...item,
        animation: null
      })),
      selectedWindowId: state.selectedWindowId,
      zCounter: state.zCounter,
      fileSystem
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage failures (private mode or quota)
  }
}

function schedulePersist() {
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(persistState, 200);
}

function restoreState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return;
    }

    if (Array.isArray(parsed.desktopItems)) {
      state.desktopItems = parsed.desktopItems;
    }
    if (parsed.controlCenter) {
      state.controlCenter = { ...state.controlCenter, ...parsed.controlCenter };
    }
    if (Array.isArray(parsed.notifications)) {
      state.notifications = parsed.notifications;
    }
    if (parsed.safari) {
      state.safari = { ...state.safari, ...parsed.safari };
    }
    if (parsed.notes) {
      state.notes = { ...state.notes, ...parsed.notes };
      state.notes.autosavedAt = new Date(state.notes.autosavedAt ?? Date.now());
    }
    if (parsed.settings) {
      state.settings = { ...state.settings, ...parsed.settings };
    }
    if (parsed.finder) {
      state.finder = { ...state.finder, ...parsed.finder };
    }
    if (Array.isArray(parsed.windows)) {
      state.windows = parsed.windows.map((item) => ({
        ...item,
        animation: null
      }));
      const maxWindowSeq = state.windows.reduce((maxValue, item) => {
        const seq = Number(String(item.id).replace("w", ""));
        return Number.isFinite(seq) ? Math.max(maxValue, seq) : maxValue;
      }, 0);
      state.nextWindowId = Math.max(state.nextWindowId, maxWindowSeq + 1);
    }
    if (typeof parsed.selectedWindowId === "string" || parsed.selectedWindowId === null) {
      state.selectedWindowId = parsed.selectedWindowId;
    }
    if (typeof parsed.zCounter === "number") {
      state.zCounter = parsed.zCounter;
    }
    if (parsed.fileSystem && parsed.fileSystem.type === "folder") {
      fileSystem = parsed.fileSystem;
    }
  } catch {
    // keep defaults on parse/storage error
  }
}

const dragState = {
  type: null,
  windowId: null,
  iconId: null,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
  originWidth: 0,
  originHeight: 0
};

const app = document.querySelector("#app");

function resetDragState() {
  dragState.type = null;
  dragState.windowId = null;
  dragState.iconId = null;
  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerup", handlePointerUp);
  window.removeEventListener("pointercancel", handlePointerUp);
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatClock(date) {
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const shortDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const shortTime = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `${weekday} ${shortDate} ${shortTime}`;
}

function formatSavedTime(date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function getAppById(appId) {
  return appRegistry.find((item) => item.id === appId) ?? appRegistry[0];
}

function getWindowById(windowId) {
  return state.windows.find((item) => item.id === windowId) ?? null;
}

function clearWindowAnimationTimer(windowId) {
  const existingTimer = windowAnimationTimers.get(windowId);
  if (!existingTimer) {
    return;
  }
  window.clearTimeout(existingTimer);
  windowAnimationTimers.delete(windowId);
}

function cancelWindowDrag(windowId) {
  if (!windowId || dragState.windowId !== windowId) {
    return;
  }
  if (dragState.type !== "window-move" && dragState.type !== "window-resize") {
    return;
  }
  state.snapPreview = null;
  resetDragState();
}

function pickTopWindowId() {
  const ordered = [...state.windows]
    .filter((item) => item.animation !== "closing")
    .sort((a, b) => b.z - a.z);
  const visible = ordered.find((item) => !item.minimized);
  return visible?.id ?? ordered[0]?.id ?? null;
}

function removeWindowById(windowId) {
  clearWindowAnimationTimer(windowId);
  state.windows = state.windows.filter((item) => item.id !== windowId);
  if (state.selectedWindowId === windowId || !getWindowById(state.selectedWindowId)) {
    state.selectedWindowId = pickTopWindowId();
  }
}

function runWindowAnimation(windowId, phase, duration, onDone = null) {
  const targetWindow = getWindowById(windowId);
  if (!targetWindow) {
    return;
  }
  targetWindow.animation = phase;
  clearWindowAnimationTimer(windowId);
  const timer = window.setTimeout(() => {
    const latestWindow = getWindowById(windowId);
    if (latestWindow) {
      latestWindow.animation = null;
    }
    windowAnimationTimers.delete(windowId);
    if (onDone) {
      onDone();
    } else {
      render();
    }
  }, duration);
  windowAnimationTimers.set(windowId, timer);
}

function getSelectedWindow() {
  return getWindowById(state.selectedWindowId);
}

function getSelectedApp() {
  return getAppById(getSelectedWindow()?.appId ?? "finder");
}

function getOrderedVisibleWindows() {
  return [...state.windows].filter((item) => !item.minimized).sort((a, b) => a.z - b.z);
}

function getRunningAppIds() {
  return [...new Set(state.windows.map((item) => item.appId))];
}

function getDesktopItemById(itemId) {
  return state.desktopItems.find((item) => item.id === itemId) ?? null;
}

function getDesktopRect(item) {
  return {
    left: item.x,
    top: item.y,
    right: item.x + DESKTOP_ICON_WIDTH,
    bottom: item.y + DESKTOP_ICON_HEIGHT
  };
}

function getSelectionRect(startX, startY, currentX, currentY) {
  return {
    left: Math.min(startX, currentX),
    top: Math.min(startY, currentY),
    width: Math.abs(currentX - startX),
    height: Math.abs(currentY - startY)
  };
}

function rectIntersects(a, b) {
  return a.left < b.right && a.left + a.width > b.left && a.top < b.bottom && a.top + a.height > b.top;
}

function gridSnap(value, origin, step) {
  return origin + Math.round((value - origin) / step) * step;
}

function findFileNodeById(node, targetId, path = []) {
  const nextPath = [...path, node];
  if (node.id === targetId) {
    return { node, path: nextPath };
  }
  for (const child of node.children ?? []) {
    const result = findFileNodeById(child, targetId, nextPath);
    if (result) {
      return result;
    }
  }
  return null;
}

function getFileParent(targetId, node = fileSystem, parent = null) {
  if (node.id === targetId) {
    return parent;
  }
  for (const child of node.children ?? []) {
    const result = getFileParent(targetId, child, node);
    if (result) {
      return result;
    }
  }
  return null;
}

function getFinderFolder() {
  return findFileNodeById(fileSystem, state.finder.currentFolderId)?.node ?? fileSystem;
}

function getFinderSelection() {
  return findFileNodeById(fileSystem, state.finder.selectedEntryId)?.node ?? null;
}

function getFinderPathNodes() {
  return findFileNodeById(fileSystem, state.finder.currentFolderId)?.path ?? [fileSystem];
}

function navigateFinderTo(folderId, options = {}) {
  const result = findFileNodeById(fileSystem, folderId);
  if (!result || result.node.type !== "folder") {
    return;
  }

  state.finder.currentFolderId = result.node.id;
  state.finder.selectedEntryId = result.node.children?.[0]?.id ?? result.node.id;

  if (options.pushHistory !== false) {
    const nextHistory = state.finder.history.slice(0, state.finder.historyIndex + 1);
    nextHistory.push(result.node.id);
    state.finder.history = nextHistory.slice(-20);
    state.finder.historyIndex = state.finder.history.length - 1;
  }
}

function goFinderHistory(direction) {
  const delta = direction === "back" ? -1 : 1;
  const nextIndex = state.finder.historyIndex + delta;
  const nextId = state.finder.history[nextIndex];
  if (!nextId) {
    return;
  }
  state.finder.historyIndex = nextIndex;
  navigateFinderTo(nextId, { pushHistory: false });
  render();
}

function openFinderEntry(entryId) {
  const result = findFileNodeById(fileSystem, entryId);
  if (!result) {
    return;
  }
  if (result.node.type === "folder") {
    navigateFinderTo(result.node.id, { pushHistory: true });
    openApp("finder");
    render();
    return;
  }
  if (result.node.appId === "notes") {
    openApp("notes");
    return;
  }
  if (result.node.appId === "safari") {
    state.safari.query = result.node.name.replace(/\.url$/, "");
    submitSafariSearch();
    return;
  }
  openApp("finder");
}

function createFinderEntry(type) {
  const folder = getFinderFolder();
  if (!folder.children) {
    folder.children = [];
  }
  const timestamp = Date.now().toString(36);
  const entry =
    type === "folder"
      ? { id: `folder-${timestamp}`, name: "Untitled Folder", type: "folder", children: [] }
      : { id: `file-${timestamp}`, name: "Untitled Note.md", type: "file", appId: "notes" };
  folder.children.unshift(entry);
  state.finder.selectedEntryId = entry.id;
  state.finder.editingEntryId = entry.id;
  state.finder.editingName = entry.name;
  render();
}

function setFinderSort(mode) {
  state.finder.sortMode = mode;
  render();
}

function setFinderView(mode) {
  state.finder.viewMode = mode;
  render();
}

function getFinderVisibleEntries(folder) {
  const query = state.finder.searchQuery.trim().toLowerCase();
  const entries = [...(folder.children ?? [])].filter((entry) =>
    query ? entry.name.toLowerCase().includes(query) : true
  );

  const getTypeRank = (entry) => (entry.type === "folder" ? 0 : 1);
  const compareByName = (a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });

  if (state.finder.sortMode === "name-desc") {
    return entries.sort((a, b) => getTypeRank(a) - getTypeRank(b) || compareByName(b, a));
  }

  if (state.finder.sortMode === "type") {
    return entries.sort(
      (a, b) =>
        getTypeRank(a) - getTypeRank(b) ||
        (a.type === b.type ? 0 : a.type.localeCompare(b.type)) ||
        compareByName(a, b)
    );
  }

  return entries.sort((a, b) => getTypeRank(a) - getTypeRank(b) || compareByName(a, b));
}

function beginRenameFinderEntry(entryId) {
  const selection = findFileNodeById(fileSystem, entryId)?.node;
  if (!selection || entryId === "desktop") {
    return;
  }
  state.finder.editingEntryId = entryId;
  state.finder.editingName = selection.name;
  render();
}

function commitRenameFinderEntry() {
  if (!state.finder.editingEntryId) {
    return;
  }
  const result = findFileNodeById(fileSystem, state.finder.editingEntryId);
  const nextName = state.finder.editingName.trim();
  if (result?.node && nextName) {
    result.node.name = nextName;
  }
  state.finder.editingEntryId = null;
  state.finder.editingName = "";
  render();
}

function deleteFinderEntry(entryId) {
  if (!entryId || entryId === "desktop") {
    return;
  }
  const parent = getFileParent(entryId);
  if (!parent?.children) {
    return;
  }
  parent.children = parent.children.filter((child) => child.id !== entryId);
  state.finder.selectedEntryId = parent.children[0]?.id ?? parent.id;
  state.finder.editingEntryId = null;
  state.finder.editingName = "";
  render();
}

function lockSession() {
  state.session.locked = true;
  state.session.unlockInput = "";
  state.session.unlockError = "";
  state.openMenu = null;
  state.openOverlay = null;
  state.contextMenu = null;
  state.missionControl = false;
  render();
}

function unlockSession() {
  if (state.session.unlockInput === state.session.password) {
    state.session.locked = false;
    state.session.unlockInput = "";
    state.session.unlockError = "";
    render();
    return;
  }
  state.session.unlockError = "Password incorrect";
  render();
}

function pulseMinimizedApp(appId) {
  state.minimizingAppId = appId;
  render();
  window.setTimeout(() => {
    if (state.minimizingAppId === appId) {
      state.minimizingAppId = null;
      render();
    }
  }, 320);
}

function listTree(node, currentFolderId) {
  const children = node.children ?? [];
  return `
    <div class="finder-tree-group">
      <button class="finder-tree-row ${node.id === currentFolderId ? "selected" : ""}" data-finder-open="${node.id}">
        <span>${node.type === "folder" ? "▸" : "•"}</span>
        <span>${node.name}</span>
      </button>
      ${
        children.length
          ? `<div class="finder-tree-children">${children
              .filter((child) => child.type === "folder")
              .map((child) => listTree(child, currentFolderId))
              .join("")}</div>`
          : ""
      }
    </div>
  `;
}

function clampWindow(windowState) {
  const maxWidth = Math.max(420, window.innerWidth - 24);
  const maxHeight = Math.max(320, window.innerHeight - 132);
  windowState.width = Math.min(Math.max(windowState.width, 420), maxWidth);
  windowState.height = Math.min(Math.max(windowState.height, 320), maxHeight);
  windowState.x = Math.min(Math.max(windowState.x, 12), Math.max(12, window.innerWidth - windowState.width - 12));
  windowState.y = Math.min(Math.max(windowState.y, 44), Math.max(44, window.innerHeight - windowState.height - 108));
}

function getSnapBounds(type) {
  const top = 42;
  const gutter = 12;
  const width = window.innerWidth - gutter * 2;
  const height = window.innerHeight - top - 120;

  if (type === "left") {
    return { x: gutter, y: top, width: Math.floor(width / 2) - 6, height };
  }
  if (type === "right") {
    return { x: gutter + Math.floor(width / 2) + 6, y: top, width: Math.floor(width / 2) - 6, height };
  }
  if (type === "top") {
    return { x: gutter, y: top, width, height };
  }
  return null;
}

function getSnapTarget(pointerX, pointerY) {
  const edge = 36;
  if (pointerX <= edge) {
    return "left";
  }
  if (pointerX >= window.innerWidth - edge) {
    return "right";
  }
  if (pointerY <= 44) {
    return "top";
  }
  return null;
}

function applySnap(windowId, snapType) {
  const targetWindow = getWindowById(windowId);
  const bounds = getSnapBounds(snapType);
  if (!targetWindow || !bounds) {
    return;
  }
  targetWindow.fullscreen = false;
  targetWindow.tiled = snapType;
  targetWindow.x = bounds.x;
  targetWindow.y = bounds.y;
  targetWindow.width = bounds.width;
  targetWindow.height = bounds.height;
  focusWindow(windowId);
}

function focusWindow(windowId) {
  const targetWindow = getWindowById(windowId);
  if (!targetWindow || targetWindow.animation === "closing") {
    return;
  }
  state.selectedWindowId = windowId;
  state.selectedDesktopIds = [];
  targetWindow.minimized = false;
  targetWindow.z = ++state.zCounter;
}

function createWindow(appId) {
  const definition = getAppById(appId);
  const defaults = appDefaults[appId] ?? appDefaults.finder;
  const newWindow = {
    id: `w${state.nextWindowId++}`,
    appId,
    width: defaults.width,
    height: defaults.height,
    x: defaults.x + state.windows.length * 18,
    y: defaults.y + state.windows.length * 18,
    z: ++state.zCounter,
    minimized: false,
    fullscreen: false,
    tiled: null,
    previousBounds: null,
    animation: null
  };
  clampWindow(newWindow);
  state.windows.push(newWindow);
  state.selectedWindowId = newWindow.id;
  state.selectedDesktopIds = [];
  runWindowAnimation(newWindow.id, "opening", WINDOW_ANIMATION_MS.open);
}

function openApp(appId, options = {}) {
  if (!options.forceNew) {
    const existingWindow = [...state.windows].reverse().find((item) => item.appId === appId && item.animation !== "closing");
    if (existingWindow) {
      if (existingWindow.minimized) {
        restoreWindow(existingWindow.id);
      } else {
        focusWindow(existingWindow.id);
        render();
      }
      return;
    }
  }
  createWindow(appId);
  render();
}

function closeWindow(windowId) {
  const targetWindow = getWindowById(windowId);
  if (!targetWindow) {
    return;
  }
  if (targetWindow.animation === "closing") {
    return;
  }
  cancelWindowDrag(windowId);
  if (targetWindow.minimized) {
    removeWindowById(windowId);
    render();
    return;
  }
  runWindowAnimation(windowId, "closing", WINDOW_ANIMATION_MS.close, () => {
    removeWindowById(windowId);
    render();
  });
  render();
}

function minimizeWindow(windowId) {
  const targetWindow = getWindowById(windowId);
  if (!targetWindow) {
    return;
  }
  if (targetWindow.minimized || targetWindow.animation === "minimizing" || targetWindow.animation === "closing") {
    return;
  }
  cancelWindowDrag(windowId);
  pulseMinimizedApp(targetWindow.appId);
  const nextWindow =
    getOrderedVisibleWindows()
      .filter((item) => item.id !== windowId && item.animation !== "closing" && item.animation !== "minimizing")
      .at(-1) ?? null;
  state.selectedWindowId = nextWindow?.id ?? null;
  runWindowAnimation(windowId, "minimizing", WINDOW_ANIMATION_MS.minimize, () => {
    const latestWindow = getWindowById(windowId);
    if (latestWindow) {
      latestWindow.minimized = true;
      latestWindow.animation = null;
    }
    render();
  });
  render();
}

function restoreWindow(windowId) {
  const targetWindow = getWindowById(windowId);
  if (!targetWindow) {
    return;
  }
  if (targetWindow.animation === "closing" || targetWindow.animation === "restoring") {
    return;
  }
  cancelWindowDrag(windowId);
  if (!targetWindow.minimized && targetWindow.animation !== "minimizing") {
    focusWindow(windowId);
    render();
    return;
  }
  targetWindow.minimized = false;
  focusWindow(windowId);
  runWindowAnimation(windowId, "restoring", WINDOW_ANIMATION_MS.restore);
  render();
}

function toggleWindowFullscreen(windowId) {
  const targetWindow = getWindowById(windowId);
  if (!targetWindow) {
    return;
  }
  if (targetWindow.minimized || targetWindow.animation) {
    return;
  }
  cancelWindowDrag(windowId);
  if (!targetWindow.fullscreen) {
    targetWindow.previousBounds = {
      x: targetWindow.x,
      y: targetWindow.y,
      width: targetWindow.width,
      height: targetWindow.height
    };
    targetWindow.fullscreen = true;
    targetWindow.tiled = null;
  } else if (targetWindow.previousBounds) {
    Object.assign(targetWindow, targetWindow.previousBounds);
    targetWindow.previousBounds = null;
    targetWindow.fullscreen = false;
    clampWindow(targetWindow);
  } else {
    targetWindow.fullscreen = false;
  }
  focusWindow(windowId);
  render();
}

function cycleWindows() {
  const ordered = [...state.windows].filter((item) => item.animation !== "closing").sort((a, b) => b.z - a.z);
  if (!ordered.length) {
    return;
  }
  const currentIndex = ordered.findIndex((item) => item.id === state.selectedWindowId);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % ordered.length;
  state.switcherVisible = true;
  state.switcherIndex = nextIndex;
  focusWindow(ordered[nextIndex].id);
  render();
}

function setMissionControl(open) {
  window.clearTimeout(missionControlTimer);
  if (open) {
    state.missionControl = true;
    state.missionControlPhase = "enter";
    state.openOverlay = null;
    state.openMenu = null;
    render();
    missionControlTimer = window.setTimeout(() => {
      state.missionControlPhase = "steady";
      render();
    }, 170);
    return;
  }
  if (!state.missionControl) {
    return;
  }
  state.missionControlPhase = "leave";
  render();
  missionControlTimer = window.setTimeout(() => {
    state.missionControl = false;
    state.missionControlPhase = "idle";
    render();
  }, 170);
}

function clearDesktopSelection() {
  state.selectedDesktopIds = [];
}

function selectDesktopItem(itemId, additive = false) {
  if (additive) {
    state.selectedDesktopIds = state.selectedDesktopIds.includes(itemId)
      ? state.selectedDesktopIds.filter((id) => id !== itemId)
      : [...state.selectedDesktopIds, itemId];
  } else {
    state.selectedDesktopIds = [itemId];
  }
  state.selectedWindowId = null;
  render();
}

function openDesktopItem(itemId) {
  const item = getDesktopItemById(itemId);
  if (!item) {
    return;
  }
  state.selectedDesktopIds = [itemId];
  openApp(item.appId);
}

function openContextMenu(kind, x, y, payload = {}) {
  state.contextMenu = { kind, x, y, payload };
  state.openMenu = null;
  state.menuTracking = false;
  state.menuClickGuard = false;
  render();
}

function closeTransientSurfaces() {
  let changed = false;
  if (state.openMenu) {
    state.openMenu = null;
    state.menuTracking = false;
    state.menuClickGuard = false;
    changed = true;
  }
  if (state.openOverlay) {
    state.openOverlay = null;
    changed = true;
  }
  if (state.switcherVisible) {
    state.switcherVisible = false;
    changed = true;
  }
  if (state.contextMenu) {
    state.contextMenu = null;
    changed = true;
  }
  if (state.missionControl) {
    state.missionControl = false;
    changed = true;
  }
  if (changed) {
    render();
  }
}

function setOverlay(name) {
  state.missionControl = false;
  state.contextMenu = null;
  state.openMenu = null;
  state.menuTracking = false;
  state.menuClickGuard = false;
  state.openOverlay = state.openOverlay === name ? null : name;
  render();
}

function toggleMenu(name) {
  state.contextMenu = null;
  state.missionControl = false;
  state.openOverlay = null;
  state.menuTracking = false;
  state.menuClickGuard = false;
  state.openMenu = state.openMenu === name ? null : name;
  render();
}

function toggleTile(key) {
  state.controlCenter[key] = !state.controlCenter[key];
  render();
}

function updateSlider(key, value) {
  state.controlCenter[key] = Number(value);
  render();
}

function dismissNotification(id) {
  state.notifications = state.notifications.filter((item) => item.id !== id);
  render();
}

function addNotification(title, body) {
  state.notifications = [{ id: String(state.nextNotificationId++), title, body }, ...state.notifications].slice(0, 6);
  render();
}

function submitSafariSearch() {
  const query = state.safari.query.trim();
  if (!query) {
    return;
  }
  state.safari.visited = query;
  state.safari.history = [query, ...state.safari.history.filter((item) => item !== query)].slice(0, 5);
  addNotification("Safari", `Opened ${query}`);
}

function updateNotes(text) {
  state.notes.text = text;
  state.notes.autosavedAt = new Date();
}

function applyNotePreset(index) {
  const preset = notesPresets[index];
  if (!preset) {
    return;
  }
  state.notes.text = `${state.notes.text.trim()}\n${preset}`.trim();
  state.notes.autosavedAt = new Date();
  render();
}

function chooseSettingsSection(section) {
  state.settings.selected = section;
  render();
}

function runContextMenuAction(action, payload = {}) {
  if (action === "desktop-new-finder") {
    openApp("finder", { forceNew: true });
    return;
  }
  if (action === "desktop-launchpad") {
    setOverlay("launchpad");
    return;
  }
  if (action === "desktop-mission-control") {
    setMissionControl(true);
    return;
  }
  if (action === "desktop-sort") {
    state.desktopItems = [...state.desktopItems]
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((item, index) => ({
        ...item,
        x: DESKTOP_GRID_ORIGIN.x + Math.floor(index / 4) * DESKTOP_GRID_STEP.x,
        y: DESKTOP_GRID_ORIGIN.y + (index % 4) * DESKTOP_GRID_STEP.y
      }));
    render();
    return;
  }
  if (action === "desktop-lock") {
    lockSession();
    return;
  }
  if (action === "icon-open" && payload.iconId) {
    openDesktopItem(payload.iconId);
    return;
  }
  if (action === "icon-reveal" && payload.iconId) {
    const icon = getDesktopItemById(payload.iconId);
    if (!icon) {
      return;
    }
    const folderMap = {
      projects: "projects-dir",
      screenshots: "screenshots-dir",
      "quick-notes": "notes-dir",
      "web-links": "links-dir",
      "macintosh-hd": "desktop"
    };
    navigateFinderTo(folderMap[icon.id] ?? "desktop", { pushHistory: true });
    openApp("finder");
    return;
  }
  if (action === "window-close" && payload.windowId) {
    closeWindow(payload.windowId);
    return;
  }
  if (action === "window-tile-left" && payload.windowId) {
    applySnap(payload.windowId, "left");
    render();
    return;
  }
  if (action === "window-tile-right" && payload.windowId) {
    applySnap(payload.windowId, "right");
    render();
    return;
  }
  if (action === "finder-new-folder") {
    createFinderEntry("folder");
    return;
  }
  if (action === "finder-new-note") {
    createFinderEntry("file");
    return;
  }
  if (action === "finder-rename" && state.finder.selectedEntryId) {
    beginRenameFinderEntry(state.finder.selectedEntryId);
    return;
  }
  if (action === "finder-delete" && state.finder.selectedEntryId) {
    deleteFinderEntry(state.finder.selectedEntryId);
  }
}

function runMenuAction(action) {
  const selectedWindow = getSelectedWindow();
  if (action === "launchpad") {
    setOverlay("launchpad");
    return;
  }
  if (action === "control-center") {
    setOverlay("control");
    return;
  }
  if (action === "notifications") {
    setOverlay("notification");
    return;
  }
  if (action === "mission-control") {
    setMissionControl(!state.missionControl);
    return;
  }
  if (action === "lock-screen") {
    lockSession();
    return;
  }
  if (action === "new-finder") {
    openApp("finder", { forceNew: true });
    return;
  }
  if (action === "new-safari-tab") {
    openApp("safari");
    return;
  }
  if (action === "new-note") {
    openApp("notes");
    state.notes.text = `${state.notes.text.trim()}\n- New note at ${formatSavedTime(new Date())}`.trim();
    state.notes.autosavedAt = new Date();
    render();
    return;
  }
  if (action === "open-settings") {
    openApp("settings");
    return;
  }
  if (action === "close-window" && selectedWindow) {
    closeWindow(selectedWindow.id);
    return;
  }
  if (action === "minimize-window" && selectedWindow) {
    minimizeWindow(selectedWindow.id);
    return;
  }
  if (action === "zoom-window" && selectedWindow) {
    toggleWindowFullscreen(selectedWindow.id);
    return;
  }
  if (action === "tile-left" && selectedWindow) {
    applySnap(selectedWindow.id, "left");
    render();
    return;
  }
  if (action === "tile-right" && selectedWindow) {
    applySnap(selectedWindow.id, "right");
    render();
    return;
  }
  if (action === "cycle-windows") {
    cycleWindows();
    return;
  }
  if (action === "show-desktop") {
    state.selectedWindowId = null;
    clearDesktopSelection();
    render();
    return;
  }
  if (action === "clear-notifications") {
    state.notifications = [];
    render();
    return;
  }
  if (action === "sort-desktop") {
    runContextMenuAction("desktop-sort");
    return;
  }
  if (action === "finder-new-folder") {
    createFinderEntry("folder");
    return;
  }
  if (action === "finder-new-note") {
    createFinderEntry("file");
    return;
  }
  if (action === "finder-rename") {
    beginRenameFinderEntry(state.finder.selectedEntryId);
    return;
  }
  if (action === "finder-delete") {
    deleteFinderEntry(state.finder.selectedEntryId);
  }
}

function getMenuItems(name) {
  const activeApp = getSelectedApp();
  const appActionMap = {
    finder: "new-finder",
    safari: "new-safari-tab",
    notes: "new-note",
    settings: "open-settings"
  };
  if (name === "apple") {
    return [
      { title: "Launchpad", action: "launchpad", shortcut: "Cmd L" },
      { title: "Mission Control", action: "mission-control", shortcut: "Cmd Shift M" },
      { title: "Lock Screen", action: "lock-screen", shortcut: "Cmd Shift L" },
      { title: "Control Center", action: "control-center" },
      { title: "Notification Center", action: "notifications" },
      { title: "System Settings", action: "open-settings", shortcut: "Cmd 4" }
    ];
  }
  if (name === "app") {
    return [
      { title: `About ${activeApp.title}`, action: "show-desktop" },
      { title: `Open Another ${activeApp.title}`, action: appActionMap[activeApp.id] ?? "new-finder" },
      { title: "System Settings", action: "open-settings" }
    ];
  }
  if (name === "file") {
    return [
      { title: "New Finder Window", action: "new-finder", shortcut: "Cmd 1" },
      { title: "New Safari Session", action: "new-safari-tab", shortcut: "Cmd 2" },
      { title: "New Note", action: "new-note", shortcut: "Cmd 3" },
      { title: "New Finder Folder", action: "finder-new-folder" },
      { title: "New Finder Note", action: "finder-new-note" }
    ];
  }
  if (name === "edit") {
    return [
      { title: "Rename Selected Item", action: "finder-rename", shortcut: "Enter" },
      { title: "Delete Selected Item", action: "finder-delete", shortcut: "Backspace" }
    ];
  }
  if (name === "view") {
    return [
      { title: "Mission Control", action: "mission-control", shortcut: "Cmd Shift M" },
      { title: "Launchpad", action: "launchpad", shortcut: "Cmd L" },
      { title: "Notification Center", action: "notifications" },
      { title: "Sort Desktop by Name", action: "sort-desktop" }
    ];
  }
  if (name === "window") {
    return [
      { title: "Minimize", action: "minimize-window", shortcut: "Cmd M" },
      { title: "Toggle Full Screen", action: "zoom-window", shortcut: "Cmd F" },
      { title: "Tile Left", action: "tile-left" },
      { title: "Tile Right", action: "tile-right" },
      { title: "Cycle Through Windows", action: "cycle-windows", shortcut: "Alt Tab" },
      { title: "Close Window", action: "close-window", shortcut: "Cmd W" }
    ];
  }
  if (name === "help") {
    return [
      { title: "Desktop box selection supported", action: "show-desktop" },
      { title: "Right click on desktop, icons, or windows", action: "show-desktop" },
      { title: "Mission Control shows all open windows", action: "mission-control" }
    ];
  }
  return [];
}

function renderMenuBar() {
  const activeApp = getSelectedApp();
  return `
    <header class="menu-bar">
      <nav class="menu-left">
        ${menuDefinitions
          .map((item) => {
            const label = item.id === "app" ? activeApp.title : item.label;
            const strongClass = item.id === "app" ? " strong" : "";
            const openClass = state.openMenu === item.id ? " open" : "";
            return `
              <div class="menu-slot">
                <button class="menu-item${strongClass}${openClass}" data-menu="${item.id}">${label}</button>
                ${
                  state.openMenu === item.id
                    ? `<div class="menu-dropdown" data-surface="true">
                        ${getMenuItems(item.id)
                          .map(
                            (entry) => `
                              <button class="menu-dropdown-item" data-menu-action="${entry.action}">
                                <span>${entry.title}</span>
                                <span class="menu-shortcut">${entry.shortcut ?? ""}</span>
                              </button>
                            `
                          )
                          .join("")}
                      </div>`
                    : ""
                }
              </div>
            `;
          })
          .join("")}
      </nav>
      <div class="menu-right">
        <button class="menu-icon ${state.openOverlay === "control" ? "open" : ""}" data-overlay-toggle="control">􀙇</button>
        <button class="menu-icon ${state.openOverlay === "launchpad" ? "open" : ""}" data-overlay-toggle="launchpad">􀏅</button>
        <button class="menu-icon ${state.missionControl ? "open" : ""}" data-mission-control="true">􀈌</button>
        <button class="menu-icon ${state.openOverlay === "notification" ? "open" : ""}" data-overlay-toggle="notification">􀍪</button>
        <button class="menu-clock ${state.openOverlay === "notification" ? "open" : ""}" data-overlay-toggle="notification">
          ${formatClock(state.now)}
        </button>
      </div>
    </header>
  `;
}

function renderDesktopIcons() {
  return `
    <aside class="desktop-icons">
      ${state.desktopItems
        .map(
          (item) => `
            <button
              class="desktop-icon ${state.selectedDesktopIds.includes(item.id) ? "selected" : ""}"
              style="left:${item.x}px; top:${item.y}px;"
              data-desktop-item="${item.id}"
            >
              <span class="desktop-icon-art">${item.icon}</span>
              <span>${item.label}</span>
            </button>
          `
        )
        .join("")}
    </aside>
  `;
}

function renderDesktopSelectionRect() {
  if (!state.desktopSelectionRect) {
    return "";
  }
  const rect = state.desktopSelectionRect;
  return `<div class="desktop-selection-box" style="left:${rect.left}px; top:${rect.top}px; width:${rect.width}px; height:${rect.height}px;"></div>`;
}

function renderFinderContent() {
  const folder = getFinderFolder();
  const selectedEntry = getFinderSelection();
  const visibleEntries = getFinderVisibleEntries(folder);
  const pathNodes = getFinderPathNodes();
  const canGoBack = state.finder.historyIndex > 0;
  const canGoForward = state.finder.historyIndex < state.finder.history.length - 1;
  const isGrid = state.finder.viewMode === "grid";

  return `
    <div class="finder-toolbar">
      <div class="finder-bar-group">
        <button class="finder-nav-btn" data-finder-nav="back" ${canGoBack ? "" : "disabled"}>◀</button>
        <button class="finder-nav-btn" data-finder-nav="forward" ${canGoForward ? "" : "disabled"}>▶</button>
        <button class="finder-nav-btn" data-finder-nav="up">↑</button>
      </div>
      <div class="finder-breadcrumbs">
        ${pathNodes
          .map(
            (node, index) => `
              <button class="finder-crumb ${index === pathNodes.length - 1 ? "active" : ""}" data-finder-breadcrumb="${node.id}">
                ${node.name}
              </button>
            `
          )
          .join("")}
      </div>
      <div class="finder-bar-group finder-tools">
        <input
          class="finder-search"
          placeholder="Search in ${folder.name}"
          value="${escapeHTML(state.finder.searchQuery)}"
          data-finder-search="true"
        />
        <select class="finder-sort" data-finder-sort="true">
          <option value="name-asc" ${state.finder.sortMode === "name-asc" ? "selected" : ""}>Name ↑</option>
          <option value="name-desc" ${state.finder.sortMode === "name-desc" ? "selected" : ""}>Name ↓</option>
          <option value="type" ${state.finder.sortMode === "type" ? "selected" : ""}>Type</option>
        </select>
        <button class="finder-view ${isGrid ? "" : "active"}" data-finder-view="list">List</button>
        <button class="finder-view ${isGrid ? "active" : ""}" data-finder-view="grid">Grid</button>
      </div>
    </div>
    <div class="finder-shell">
      <aside class="finder-sidebar">
        <h2>Locations</h2>
        ${listTree(fileSystem, state.finder.currentFolderId)}
      </aside>
      <section class="finder-main">
        <div class="finder-header-row">
          <div>
            <h2>${folder.name}</h2>
            <p>${folder.children?.length ?? 0} items</p>
          </div>
          <div class="detail-pills">
            <button class="detail-pill" data-menu-action="finder-new-folder">New Folder</button>
            <button class="detail-pill" data-menu-action="finder-new-note">New Note</button>
            <button class="detail-pill" data-menu-action="finder-rename">Rename</button>
            <button class="detail-pill" data-menu-action="finder-delete">Delete</button>
          </div>
        </div>
        <div class="finder-list-shell ${isGrid ? "grid" : "list"}">
          ${visibleEntries.length
            ? visibleEntries
            .map(
              (child) => `
                ${
                  state.finder.editingEntryId === child.id
                    ? `
                      <form class="finder-entry selected editing ${isGrid ? "grid" : ""}" data-finder-rename-form="${child.id}">
                        <span class="finder-entry-icon">${child.type === "folder" ? "📁" : "📄"}</span>
                        <input class="finder-entry-input" value="${escapeHTML(state.finder.editingName)}" data-finder-rename-input="true" />
                      </form>
                    `
                    : `
                      <button
                        class="finder-entry ${selectedEntry?.id === child.id ? "selected" : ""} ${isGrid ? "grid" : ""}"
                        data-finder-select="${child.id}"
                        data-finder-open="${child.id}"
                      >
                        <span class="finder-entry-icon">${child.type === "folder" ? "📁" : "📄"}</span>
                        <span>${child.name}</span>
                      </button>
                    `
                }
              `
            )
            .join("")
            : '<p class="finder-empty">No matching files.</p>'}
        </div>
      </section>
    </div>
  `;
}

function renderSafariContent() {
  return `
    <div class="browser-shell">
      <form class="browser-form" data-safari-form="true">
        <input
          class="browser-input"
          type="text"
          value="${escapeHTML(state.safari.query)}"
          placeholder="Search or enter website name"
          data-safari-input="true"
        />
        <button class="browser-submit" type="submit">Go</button>
      </form>
      <div class="browser-body">
        <h2>${escapeHTML(state.safari.visited)}</h2>
        <p>Interactive start page content for the current query.</p>
        <div class="preset-row">
          ${safariPresets
            .map((item) => `<button class="preset-pill" data-safari-preset="${escapeHTML(item)}">${item}</button>`)
            .join("")}
        </div>
        <div class="history-card">
          <strong>Recent Searches</strong>
          <div class="history-list">
            ${state.safari.history
              .map((item) => `<button class="history-entry" data-safari-preset="${escapeHTML(item)}">${item}</button>`)
              .join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderNotesContent() {
  return `
    <article class="note-body">
      <div class="note-header">
        <h2>Project Notes</h2>
        <span class="autosave-pill">Autosaved ${formatSavedTime(state.notes.autosavedAt)}</span>
      </div>
      <textarea class="notes-editor" data-notes-editor="true">${escapeHTML(state.notes.text)}</textarea>
      <div class="preset-row">
        ${notesPresets
          .map((item, index) => `<button class="preset-pill" data-note-preset="${index}">Insert idea ${index + 1}</button>`)
          .join("")}
      </div>
    </article>
  `;
}

function renderSettingsContent() {
  return `
    <section class="settings-grid">
      ${settingsSections
        .map(
          (section) => `
            <button class="settings-card ${state.settings.selected === section ? "selected" : ""}" data-settings-section="${section}">
              ${section}
            </button>
          `
        )
        .join("")}
    </section>
    <section class="settings-detail">
      <h2>${state.settings.selected}</h2>
      <p>Selection syncs with control center, tiled windows, and desktop state.</p>
      <div class="detail-pills">
        <span class="detail-pill">Brightness ${state.controlCenter.brightness}%</span>
        <span class="detail-pill">Sound ${state.controlCenter.sound}%</span>
        <span class="detail-pill">${state.controlCenter.wifi ? "Wi-Fi On" : "Wi-Fi Off"}</span>
        <span class="detail-pill">${getRunningAppIds().length} Apps Running</span>
      </div>
    </section>
  `;
}

function renderAppContent(appId) {
  if (appId === "finder") {
    return renderFinderContent();
  }
  if (appId === "safari") {
    return renderSafariContent();
  }
  if (appId === "notes") {
    return renderNotesContent();
  }
  if (appId === "settings") {
    return renderSettingsContent();
  }
  return getAppById(appId).content;
}

function renderWindows() {
  return getOrderedVisibleWindows()
    .map((windowState) => {
      const appInfo = getAppById(windowState.appId);
      const isActive = state.selectedWindowId === windowState.id;
      const fullscreenClass = windowState.fullscreen ? " fullscreen" : "";
      const activeClass = isActive ? " active" : "";
      const animationClass = windowState.animation ? ` anim-${windowState.animation}` : "";
      const style = windowState.fullscreen
        ? `z-index:${windowState.z};`
        : `left:${windowState.x}px; top:${windowState.y}px; width:${windowState.width}px; height:${windowState.height}px; z-index:${windowState.z};`;
      return `
        <section class="window-stage${fullscreenClass}${activeClass}${animationClass}" style="${style}" data-window-id="${windowState.id}">
          <article class="window" style="--accent:${appInfo.accent}">
            <header class="window-toolbar" data-drag-handle="${windowState.id}">
              <div class="traffic-lights">
                <button class="light close" data-window-action="close" data-window-id="${windowState.id}" aria-label="Close window"></button>
                <button class="light minimize" data-window-action="minimize" data-window-id="${windowState.id}" aria-label="Minimize window"></button>
                <button class="light maximize" data-window-action="fullscreen" data-window-id="${windowState.id}" aria-label="Toggle fullscreen"></button>
              </div>
              <h1>${appInfo.title}${windowState.tiled ? ` · ${windowState.tiled}` : ""}</h1>
              <div class="toolbar-actions">
                <button class="ghost-btn" data-app-open="${windowState.appId}">New</button>
                <button class="ghost-btn" data-app-open="settings">Settings</button>
              </div>
            </header>
            <main class="window-content">${renderAppContent(windowState.appId)}</main>
            ${windowState.fullscreen ? "" : `<button class="resize-handle" data-resize-handle="${windowState.id}" aria-label="Resize window"></button>`}
          </article>
        </section>
      `;
    })
    .join("");
}

function renderDock() {
  const runningAppIds = getRunningAppIds();
  const hoveredIndex = appRegistry.findIndex((item) => item.id === state.dockHoverAppId);
  return `
    <footer class="dock-wrap">
      <div class="dock" data-surface="true">
        <button class="dock-item utility ${state.openOverlay === "launchpad" ? "active" : ""}" data-overlay-toggle="launchpad">
          <span class="dock-item-icon">􀏅</span>
          <span class="dock-item-title">Launchpad</span>
        </button>
        ${appRegistry
          .map((item, index) => {
            const running = runningAppIds.includes(item.id);
            const focused = getSelectedWindow()?.appId === item.id;
            const hoverDistance = hoveredIndex === -1 ? 9 : Math.abs(index - hoveredIndex);
            const hoverClass =
              hoverDistance === 0
                ? " hovered-3"
                : hoverDistance === 1
                  ? " hovered-2"
                  : hoverDistance === 2
                    ? " hovered-1"
                    : "";
            const minimizingClass = state.minimizingAppId === item.id ? " minimizing" : "";
            return `
              <button class="dock-item ${focused ? "active" : ""} ${running ? "running" : ""}${hoverClass}${minimizingClass}" data-dock-app="${item.id}">
                <span class="dock-item-icon">${item.icon}</span>
                <span class="dock-item-title">${item.title}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    </footer>
  `;
}

function renderLockScreen() {
  if (!state.session.locked) {
    return "";
  }
  return `
    <section class="lock-screen" data-surface="true">
      <div class="lock-card">
        <p class="lock-time">${formatClock(state.now)}</p>
        <h1>Alex</h1>
        <p class="lock-subtitle">Enter password to unlock this Mac</p>
        <form class="lock-form" data-unlock-form="true">
          <input
            class="lock-input"
            type="password"
            placeholder="Password"
            value="${escapeHTML(state.session.unlockInput)}"
            data-unlock-input="true"
          />
          <button class="browser-submit" type="submit">Unlock</button>
        </form>
        <p class="lock-error">${state.session.unlockError}</p>
      </div>
    </section>
  `;
}

function renderStartupScreen() {
  if (!state.startup.active) {
    return "";
  }
  return `
    <section class="startup-screen" data-surface="true">
      <div class="startup-card">
        <div class="startup-logo"></div>
        <div class="startup-progress-track">
          <div class="startup-progress-fill" style="width:${state.startup.progress}%;"></div>
        </div>
        <p class="startup-label">Starting macOS Tahoe</p>
      </div>
    </section>
  `;
}

function renderControlCenter() {
  if (state.openOverlay !== "control") {
    return "";
  }
  return `
    <aside class="floating-panel control-center" data-surface="true">
      <h2>Control Center</h2>
      <div class="tiles">
        <button class="tile ${state.controlCenter.wifi ? "active" : ""}" data-tile="wifi">Wi-Fi</button>
        <button class="tile ${state.controlCenter.bluetooth ? "active" : ""}" data-tile="bluetooth">Bluetooth</button>
        <button class="tile ${state.controlCenter.airdrop ? "active" : ""}" data-tile="airdrop">AirDrop</button>
        <button class="tile ${state.controlCenter.stageManager ? "active" : ""}" data-tile="stageManager">Stage Manager</button>
      </div>
      <label class="slider-block">
        <span>Brightness ${state.controlCenter.brightness}%</span>
        <input type="range" min="0" max="100" value="${state.controlCenter.brightness}" data-slider="brightness" />
      </label>
      <label class="slider-block">
        <span>Sound ${state.controlCenter.sound}%</span>
        <input type="range" min="0" max="100" value="${state.controlCenter.sound}" data-slider="sound" />
      </label>
    </aside>
  `;
}

function renderNotificationCenter() {
  if (state.openOverlay !== "notification") {
    return "";
  }
  return `
    <aside class="floating-panel notification-center" data-surface="true">
      <div class="notification-header">
        <h2>Notification Center</h2>
        <button class="clear-btn" data-menu-action="clear-notifications">Clear all</button>
      </div>
      ${
        state.notifications.length
          ? state.notifications
              .map(
                (item) => `
                  <article class="notification-card">
                    <div>
                      <p class="notification-title">${item.title}</p>
                      <p>${item.body}</p>
                    </div>
                    <button class="icon-btn" data-dismiss-notification="${item.id}" aria-label="Dismiss ${item.title}">×</button>
                  </article>
                `
              )
              .join("")
          : '<article class="notification-card empty"><p>No new notifications.</p></article>'
      }
    </aside>
  `;
}

function renderLaunchpad() {
  if (state.openOverlay !== "launchpad") {
    return "";
  }
  return `
    <section class="launchpad" data-surface="true">
      <div class="launchpad-panel">
        <div class="launchpad-header">
          <h2>Launchpad</h2>
          <button class="clear-btn" data-overlay-toggle="launchpad">Close</button>
        </div>
        <div class="launchpad-grid">
          ${appRegistry
            .map(
              (item) => `
                <button class="launchpad-app" data-app-open="${item.id}">
                  <span class="launchpad-icon">${item.icon}</span>
                  <span>${item.title}</span>
                </button>
              `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderMissionControl() {
  if (!state.missionControl) {
    return "";
  }
  const phaseClass = state.missionControlPhase === "enter" ? " enter" : state.missionControlPhase === "leave" ? " leave" : "";
  return `
    <section class="mission-control${phaseClass}" data-surface="true">
      <div class="mission-topbar">
        <h2>Mission Control</h2>
        <button class="clear-btn" data-mission-control="true">Close</button>
      </div>
      <div class="mission-grid">
        ${getOrderedVisibleWindows()
          .map((windowState) => {
            const appInfo = getAppById(windowState.appId);
            return `
              <button class="mission-window" data-window-focus="${windowState.id}">
                <div class="mission-window-toolbar">${appInfo.title}</div>
                <div class="mission-window-body">
                  <span class="mission-window-icon">${appInfo.icon}</span>
                  <span>${windowState.width} × ${windowState.height}</span>
                </div>
              </button>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderSwitcher() {
  if (!state.switcherVisible) {
    return "";
  }
  const ordered = [...state.windows].sort((a, b) => b.z - a.z);
  const current = ordered[state.switcherIndex] ?? ordered[0];
  if (!current) {
    return "";
  }
  const appInfo = getAppById(current.appId);
  return `
    <div class="switcher" data-surface="true">
      <div class="switcher-card">
        <span class="switcher-icon">${appInfo.icon}</span>
        <div>
          <strong>${appInfo.title}</strong>
          <p>Press Alt+Tab again to continue switching</p>
        </div>
      </div>
    </div>
  `;
}

function renderContextMenu() {
  if (!state.contextMenu) {
    return "";
  }
  const menu = state.contextMenu;
  const items =
    menu.kind === "desktop"
      ? [
          ["New Finder Window", "desktop-new-finder"],
          ["Mission Control", "desktop-mission-control"],
          ["Launchpad", "desktop-launchpad"],
          ["Sort By Name", "desktop-sort"]
        ]
      : menu.kind === "icon"
        ? [
            ["Open", "icon-open"],
            ["Reveal in Finder", "icon-reveal"]
          ]
        : [
            ["Tile Left", "window-tile-left"],
            ["Tile Right", "window-tile-right"],
            ["Close Window", "window-close"]
          ];
  return `
    <div class="context-menu" style="left:${menu.x}px; top:${menu.y}px;" data-surface="true">
      ${items
        .map(
          ([label, action]) => `
            <button class="context-menu-item" data-context-action="${action}">${label}</button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSnapPreview() {
  if (!state.snapPreview) {
    return "";
  }
  const bounds = getSnapBounds(state.snapPreview);
  if (!bounds) {
    return "";
  }
  return `<div class="snap-preview" style="left:${bounds.x}px; top:${bounds.y}px; width:${bounds.width}px; height:${bounds.height}px;"></div>`;
}

function render() {
  state.now = new Date();
  app.innerHTML = `
    <div class="desktop-wallpaper" data-desktop="true">
      ${renderMenuBar()}
      ${renderDesktopIcons()}
      ${renderDesktopSelectionRect()}
      ${renderSnapPreview()}
      ${renderWindows()}
      ${renderDock()}
      ${renderControlCenter()}
      ${renderNotificationCenter()}
      ${renderLaunchpad()}
      ${renderMissionControl()}
      ${renderSwitcher()}
      ${renderContextMenu()}
      ${renderLockScreen()}
      ${renderStartupScreen()}
    </div>
  `;
  if (!state.startup.active) {
    schedulePersist();
  }
}

function handleClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  if (state.startup.active) {
    return;
  }
  if (state.session.locked && !target.closest("[data-unlock-form]")) {
    return;
  }
  const interactiveSurface = target.closest("[data-surface='true']");
  const desktop = target.closest("[data-desktop='true']");
  const menuButton = target.closest("[data-menu]");
  const menuAction = target.closest("[data-menu-action]");
  const overlayToggle = target.closest("[data-overlay-toggle]");
  const missionControlButton = target.closest("[data-mission-control]");
  const dockApp = target.closest("[data-dock-app]");
  const appOpen = target.closest("[data-app-open]");
  const desktopItem = target.closest("[data-desktop-item]");
  const tile = target.closest("[data-tile]");
  const windowAction = target.closest("[data-window-action]");
  const dismissNotificationButton = target.closest("[data-dismiss-notification]");
  const settingsSection = target.closest("[data-settings-section]");
  const safariPreset = target.closest("[data-safari-preset]");
  const notePreset = target.closest("[data-note-preset]");
  const windowStage = target.closest("[data-window-id]");
  const contextAction = target.closest("[data-context-action]");
  const finderSelect = target.closest("[data-finder-select]");
  const finderOpen = target.closest("[data-finder-open]");
  const finderNav = target.closest("[data-finder-nav]");
  const finderBreadcrumb = target.closest("[data-finder-breadcrumb]");
  const finderView = target.closest("[data-finder-view]");
  const unlockForm = target.closest("[data-unlock-form]");
  const windowFocus = target.closest("[data-window-focus]");

  if (contextAction) {
    runContextMenuAction(contextAction.getAttribute("data-context-action"), state.contextMenu?.payload);
    state.contextMenu = null;
    return;
  }
  if (menuAction) {
    runMenuAction(menuAction.getAttribute("data-menu-action"));
    state.openMenu = null;
    state.menuTracking = false;
    state.menuClickGuard = false;
    state.openOverlay = null;
    render();
    return;
  }
  if (menuButton) {
    if (state.menuClickGuard) {
      state.menuClickGuard = false;
      return;
    }
    toggleMenu(menuButton.getAttribute("data-menu"));
    return;
  }
  if (overlayToggle) {
    setOverlay(overlayToggle.getAttribute("data-overlay-toggle"));
    return;
  }
  if (missionControlButton) {
    setMissionControl(!state.missionControl);
    return;
  }
  if (windowFocus) {
    focusWindow(windowFocus.getAttribute("data-window-focus"));
    state.missionControl = false;
    render();
    return;
  }
  if (unlockForm) {
    return;
  }
  if (dockApp) {
    const appId = dockApp.getAttribute("data-dock-app");
    const topWindow = [...state.windows].reverse().find((item) => item.appId === appId && item.animation !== "closing");
    if (!appId) {
      return;
    }
    if (!topWindow) {
      openApp(appId);
      return;
    }
    if (topWindow.id === state.selectedWindowId && !topWindow.minimized) {
      minimizeWindow(topWindow.id);
      return;
    }
    restoreWindow(topWindow.id);
    return;
  }
  if (appOpen) {
    const appId = appOpen.getAttribute("data-app-open");
    if (appId) {
      openApp(appId, { forceNew: event.altKey });
    }
    return;
  }
  if (finderSelect) {
    state.finder.selectedEntryId = finderSelect.getAttribute("data-finder-select");
    render();
    return;
  }
  if (finderOpen && !finderSelect) {
    const entryId = finderOpen.getAttribute("data-finder-open");
    state.finder.selectedEntryId = entryId;
    openFinderEntry(entryId);
    return;
  }
  if (finderNav) {
    const direction = finderNav.getAttribute("data-finder-nav");
    if (direction === "back" || direction === "forward") {
      goFinderHistory(direction);
      return;
    }
    if (direction === "up") {
      const path = getFinderPathNodes();
      const parent = path.at(-2);
      if (parent) {
        navigateFinderTo(parent.id, { pushHistory: true });
        render();
      }
      return;
    }
  }
  if (finderBreadcrumb) {
    const folderId = finderBreadcrumb.getAttribute("data-finder-breadcrumb");
    if (folderId) {
      navigateFinderTo(folderId, { pushHistory: true });
      render();
    }
    return;
  }
  if (finderView) {
    const mode = finderView.getAttribute("data-finder-view");
    if (mode === "list" || mode === "grid") {
      setFinderView(mode);
    }
    return;
  }
  if (desktopItem) {
    const itemId = desktopItem.getAttribute("data-desktop-item");
    if (itemId) {
      selectDesktopItem(itemId, event.metaKey || event.ctrlKey);
    }
    return;
  }
  if (tile) {
    const key = tile.getAttribute("data-tile");
    if (key) {
      toggleTile(key);
    }
    return;
  }
  if (windowAction) {
    const action = windowAction.getAttribute("data-window-action");
    const windowId = windowAction.getAttribute("data-window-id");
    if (action === "close") {
      closeWindow(windowId);
    }
    if (action === "minimize") {
      minimizeWindow(windowId);
    }
    if (action === "fullscreen") {
      toggleWindowFullscreen(windowId);
    }
    return;
  }
  if (dismissNotificationButton) {
    const id = dismissNotificationButton.getAttribute("data-dismiss-notification");
    if (id) {
      dismissNotification(id);
    }
    return;
  }
  if (settingsSection) {
    const section = settingsSection.getAttribute("data-settings-section");
    if (section) {
      chooseSettingsSection(section);
    }
    return;
  }
  if (safariPreset) {
    const query = safariPreset.getAttribute("data-safari-preset");
    if (query) {
      state.safari.query = query;
      submitSafariSearch();
    }
    return;
  }
  if (notePreset) {
    applyNotePreset(Number(notePreset.getAttribute("data-note-preset")));
    return;
  }
  if (windowStage) {
    focusWindow(windowStage.getAttribute("data-window-id"));
    render();
    return;
  }
  if (desktop && !interactiveSurface) {
    clearDesktopSelection();
    state.selectedWindowId = null;
    closeTransientSurfaces();
    render();
  }
}

function handleDoubleClick(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  if (state.startup.active || state.session.locked) {
    return;
  }
  const desktopItem = target.closest("[data-desktop-item]");
  if (desktopItem) {
    const itemId = desktopItem.getAttribute("data-desktop-item");
    if (itemId) {
      openDesktopItem(itemId);
    }
    return;
  }
  const finderOpen = target.closest("[data-finder-open]");
  if (finderOpen) {
    openFinderEntry(finderOpen.getAttribute("data-finder-open"));
  }
}

function handleInput(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  if (state.startup.active) {
    return;
  }
  if (state.session.locked && !target.matches("[data-unlock-input]")) {
    return;
  }
  if (target.matches("[data-slider]") && target instanceof HTMLInputElement) {
    updateSlider(target.getAttribute("data-slider"), target.value);
    return;
  }
  if (target.matches("[data-safari-input]") && target instanceof HTMLInputElement) {
    state.safari.query = target.value;
    return;
  }
  if (target.matches("[data-notes-editor]") && target instanceof HTMLTextAreaElement) {
    updateNotes(target.value);
    return;
  }
  if (target.matches("[data-finder-search]") && target instanceof HTMLInputElement) {
    state.finder.searchQuery = target.value;
    render();
    return;
  }
  if (target.matches("[data-finder-sort]") && target instanceof HTMLSelectElement) {
    setFinderSort(target.value);
    return;
  }
  if (target.matches("[data-finder-rename-input]") && target instanceof HTMLInputElement) {
    state.finder.editingName = target.value;
    return;
  }
  if (target.matches("[data-unlock-input]") && target instanceof HTMLInputElement) {
    state.session.unlockInput = target.value;
  }
}

function handleSubmit(event) {
  const target = event.target;
  if (!(target instanceof HTMLFormElement)) {
    return;
  }
  if (state.startup.active) {
    return;
  }
  if (state.session.locked && !target.matches("[data-unlock-form]")) {
    return;
  }
  if (target.matches("[data-safari-form]")) {
    event.preventDefault();
    submitSafariSearch();
    return;
  }
  if (target.matches("[data-finder-rename-form]")) {
    event.preventDefault();
    commitRenameFinderEntry();
    return;
  }
  if (target.matches("[data-unlock-form]")) {
    event.preventDefault();
    unlockSession();
  }
}

function handleChange(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  if (target.matches("[data-finder-sort]") && target instanceof HTMLSelectElement) {
    setFinderSort(target.value);
  }
}

function beginDrag(event, type, payload) {
  dragState.type = type;
  dragState.startX = event.clientX;
  dragState.startY = event.clientY;
  dragState.windowId = payload.windowId ?? null;
  dragState.iconId = payload.iconId ?? null;
  dragState.originX = payload.originX ?? 0;
  dragState.originY = payload.originY ?? 0;
  dragState.originWidth = payload.originWidth ?? 0;
  dragState.originHeight = payload.originHeight ?? 0;
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerUp);
}

function handlePointerDown(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  if (state.startup.active || state.session.locked) {
    return;
  }

  const menuButton = target.closest("[data-menu]");
  if (menuButton) {
    const menuId = menuButton.getAttribute("data-menu");
    if (menuId) {
      state.openMenu = menuId;
      state.openOverlay = null;
      state.menuTracking = true;
      state.menuClickGuard = true;
      render();
    }
    return;
  }

  state.contextMenu = null;

  const dragHandle = target.closest("[data-drag-handle]");
  if (dragHandle && !target.closest(".traffic-lights, .toolbar-actions, button, input, textarea")) {
    const windowId = dragHandle.getAttribute("data-drag-handle");
    const targetWindow = getWindowById(windowId);
    if (!targetWindow || targetWindow.fullscreen || targetWindow.minimized || targetWindow.animation) {
      return;
    }
    focusWindow(windowId);
    beginDrag(event, "window-move", {
      windowId,
      originX: targetWindow.x,
      originY: targetWindow.y,
      originWidth: targetWindow.width,
      originHeight: targetWindow.height
    });
    return;
  }

  const resizeHandle = target.closest("[data-resize-handle]");
  if (resizeHandle) {
    const windowId = resizeHandle.getAttribute("data-resize-handle");
    const targetWindow = getWindowById(windowId);
    if (!targetWindow || targetWindow.minimized || targetWindow.animation) {
      return;
    }
    beginDrag(event, "window-resize", {
      windowId,
      originX: targetWindow.x,
      originY: targetWindow.y,
      originWidth: targetWindow.width,
      originHeight: targetWindow.height
    });
    return;
  }

  const desktopItem = target.closest("[data-desktop-item]");
  if (desktopItem) {
    const iconId = desktopItem.getAttribute("data-desktop-item");
    const icon = getDesktopItemById(iconId);
    if (!icon) {
      return;
    }
    if (!state.selectedDesktopIds.includes(iconId)) {
      state.selectedDesktopIds = [iconId];
      render();
    }
    beginDrag(event, "desktop-icon", {
      iconId,
      originX: icon.x,
      originY: icon.y
    });
    return;
  }

  if (target.closest("[data-desktop='true']") && !target.closest("[data-surface='true'], [data-window-id]")) {
    clearDesktopSelection();
    state.selectedWindowId = null;
    state.desktopSelectionRect = getSelectionRect(event.clientX, event.clientY, event.clientX, event.clientY);
    beginDrag(event, "desktop-select", {});
    render();
  }
}

function handlePointerUpGlobal(event) {
  if (!state.menuTracking) {
    return;
  }
  state.menuTracking = false;
  const target = event.target;
  if (!(target instanceof Element) || !target.closest("[data-menu], .menu-dropdown")) {
    state.openMenu = null;
    state.menuClickGuard = false;
    render();
    return;
  }
  render();
}

function handlePointerMove(event) {
  if (dragState.type === "window-move") {
    const targetWindow = getWindowById(dragState.windowId);
    if (!targetWindow || targetWindow.minimized || targetWindow.animation) {
      resetDragState();
      state.snapPreview = null;
      render();
      return;
    }
    targetWindow.fullscreen = false;
    targetWindow.tiled = null;
    targetWindow.x = dragState.originX + (event.clientX - dragState.startX);
    targetWindow.y = dragState.originY + (event.clientY - dragState.startY);
    clampWindow(targetWindow);
    state.snapPreview = getSnapTarget(event.clientX, event.clientY);
    render();
    return;
  }

  if (dragState.type === "window-resize") {
    const targetWindow = getWindowById(dragState.windowId);
    if (!targetWindow || targetWindow.minimized || targetWindow.animation) {
      resetDragState();
      render();
      return;
    }
    targetWindow.width = dragState.originWidth + (event.clientX - dragState.startX);
    targetWindow.height = dragState.originHeight + (event.clientY - dragState.startY);
    clampWindow(targetWindow);
    render();
    return;
  }

  if (dragState.type === "desktop-select") {
    state.desktopSelectionRect = getSelectionRect(dragState.startX, dragState.startY, event.clientX, event.clientY);
    const selection = {
      left: state.desktopSelectionRect.left,
      top: state.desktopSelectionRect.top,
      width: state.desktopSelectionRect.width,
      height: state.desktopSelectionRect.height
    };
    state.selectedDesktopIds = state.desktopItems
      .filter((item) => rectIntersects(selection, getDesktopRect(item)))
      .map((item) => item.id);
    render();
    return;
  }

  if (dragState.type === "desktop-icon") {
    const icon = getDesktopItemById(dragState.iconId);
    if (!icon) {
      return;
    }
    icon.x = dragState.originX + (event.clientX - dragState.startX);
    icon.y = dragState.originY + (event.clientY - dragState.startY);
    render();
  }
}

function handlePointerUp() {
  if (dragState.type === "window-move" && dragState.windowId && state.snapPreview) {
    applySnap(dragState.windowId, state.snapPreview);
  }
  if (dragState.type === "desktop-icon" && dragState.iconId) {
    const icon = getDesktopItemById(dragState.iconId);
    if (icon) {
      icon.x = gridSnap(icon.x, DESKTOP_GRID_ORIGIN.x, DESKTOP_GRID_STEP.x);
      icon.y = gridSnap(icon.y, DESKTOP_GRID_ORIGIN.y, DESKTOP_GRID_STEP.y);
    }
  }
  if (dragState.type === "desktop-select") {
    state.desktopSelectionRect = null;
  }
  state.snapPreview = null;
  resetDragState();
  render();
}

function handleContextMenu(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  if (state.startup.active || state.session.locked) {
    return;
  }
  event.preventDefault();
  const desktopItem = target.closest("[data-desktop-item]");
  const windowStage = target.closest("[data-window-id]");
  if (desktopItem) {
    const iconId = desktopItem.getAttribute("data-desktop-item");
    state.selectedDesktopIds = [iconId];
    openContextMenu("icon", event.clientX, event.clientY, { iconId });
    return;
  }
  if (windowStage) {
    const windowId = windowStage.getAttribute("data-window-id");
    focusWindow(windowId);
    openContextMenu("window", event.clientX, event.clientY, { windowId });
    return;
  }
  openContextMenu("desktop", event.clientX, event.clientY);
}

function handleKeyDown(event) {
  if (state.startup.active) {
    return;
  }
  if (state.session.locked) {
    if (event.key === "Escape") {
      state.session.unlockInput = "";
      state.session.unlockError = "";
      render();
    }
    return;
  }
  const isMeta = event.metaKey || event.ctrlKey;
  if (event.key === "Escape") {
    closeTransientSurfaces();
    return;
  }
  if (event.altKey && event.key === "Tab") {
    event.preventDefault();
    cycleWindows();
    return;
  }
  if (!isMeta) {
    return;
  }
  if (["1", "2", "3", "4"].includes(event.key)) {
    event.preventDefault();
    openApp(["finder", "safari", "notes", "settings"][Number(event.key) - 1]);
    return;
  }
  if (event.key.toLowerCase() === "l") {
    event.preventDefault();
    setOverlay("launchpad");
    return;
  }
  if (event.shiftKey && event.key.toLowerCase() === "m") {
    event.preventDefault();
    setMissionControl(!state.missionControl);
    return;
  }
  if (event.shiftKey && event.key.toLowerCase() === "l") {
    event.preventDefault();
    lockSession();
    return;
  }
  if (event.key === "Enter" && getSelectedApp().id === "finder" && state.finder.selectedEntryId) {
    event.preventDefault();
    if (state.finder.editingEntryId) {
      commitRenameFinderEntry();
    } else {
      beginRenameFinderEntry(state.finder.selectedEntryId);
    }
    return;
  }
  if ((event.key === "Backspace" || event.key === "Delete") && getSelectedApp().id === "finder" && state.finder.selectedEntryId) {
    event.preventDefault();
    deleteFinderEntry(state.finder.selectedEntryId);
    return;
  }
  if (event.key.toLowerCase() === "w") {
    event.preventDefault();
    const selectedWindow = getSelectedWindow();
    if (selectedWindow) {
      closeWindow(selectedWindow.id);
    }
    return;
  }
  if (event.key.toLowerCase() === "m") {
    event.preventDefault();
    const selectedWindow = getSelectedWindow();
    if (selectedWindow) {
      minimizeWindow(selectedWindow.id);
    }
    return;
  }
  if (event.key.toLowerCase() === "f") {
    event.preventDefault();
    const selectedWindow = getSelectedWindow();
    if (selectedWindow) {
      toggleWindowFullscreen(selectedWindow.id);
    }
  }
}

function handleKeyUp(event) {
  if (event.key === "Alt" && state.switcherVisible) {
    state.switcherVisible = false;
    render();
  }
}

function handleResize() {
  state.windows.forEach((item) => {
    if (!item.fullscreen) {
      clampWindow(item);
    }
  });
  render();
}

function handleMouseOver(event) {
  const target = event.target;
  if (!(target instanceof Element) || state.startup.active || state.session.locked) {
    return;
  }

  const menuButton = target.closest("[data-menu]");
  if (menuButton && state.openMenu) {
    const nextMenuId = menuButton.getAttribute("data-menu");
    if (nextMenuId && nextMenuId !== state.openMenu) {
      state.openMenu = nextMenuId;
      render();
    }
    return;
  }

  const dockApp = target.closest("[data-dock-app]");
  if (dockApp) {
    const appId = dockApp.getAttribute("data-dock-app");
    if (state.dockHoverAppId !== appId) {
      state.dockHoverAppId = appId;
      render();
    }
  }
}

function handleMouseOut(event) {
  const target = event.target;
  if (!(target instanceof Element) || state.startup.active) {
    return;
  }
  const dockApp = target.closest("[data-dock-app]");
  if (dockApp && !event.relatedTarget?.closest?.("[data-dock-app]")) {
    state.dockHoverAppId = null;
    render();
  }
}

function startBootSequence() {
  state.startup.active = true;
  state.startup.progress = 0;

  const step = () => {
    const increment = state.startup.progress < 82 ? Math.random() * 12 + 5 : Math.random() * 5 + 1.5;
    state.startup.progress = Math.min(100, state.startup.progress + increment);
    render();

    if (state.startup.progress >= 100) {
      window.clearInterval(timer);
      window.setTimeout(() => {
        state.startup.active = false;
        render();
      }, 180);
    }
  };

  const timer = window.setInterval(step, 210);
  step();
}

function initializeWorkspace() {
  restoreState();

  state.windows.forEach((windowState) => {
    windowState.minimized = Boolean(windowState.minimized);
    windowState.fullscreen = Boolean(windowState.fullscreen);
    clampWindow(windowState);
  });

  if (!state.windows.length) {
    createWindow("finder");
  }
}

app.addEventListener("click", handleClick);
app.addEventListener("dblclick", handleDoubleClick);
app.addEventListener("input", handleInput);
app.addEventListener("change", handleChange);
app.addEventListener("submit", handleSubmit);
app.addEventListener("pointerdown", handlePointerDown);
app.addEventListener("pointerup", handlePointerUpGlobal);
app.addEventListener("contextmenu", handleContextMenu);
app.addEventListener("mouseover", handleMouseOver);
app.addEventListener("mouseout", handleMouseOut);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("resize", handleResize);

initializeWorkspace();
render();
startBootSequence();
window.setInterval(() => {
  state.now = new Date();
  render();
}, 30_000);
