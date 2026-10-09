// Minimal, read-only bridge: lets the web app know it's running inside the protected desktop app.
const { contextBridge } = require("electron");
contextBridge.exposeInMainWorld("dronacharyaDesktop", { isDesktop: true, platform: process.platform, contentProtected: true });
