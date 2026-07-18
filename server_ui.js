"use strict";

const fs = require("fs");
const path = require("path");
const express = require("express");
const dm = require("./jocgroq16.js");
const { enrichResponse } = require("./lib/ui_case_state.js");

const UI_VERSION = "20260717z";
const CHARACTER_PORTRAIT_STYLE = `
<style id="dp-character-portrait-size">
@media (max-width: 430px) {
  body[data-ui="dossier-premium"] .char-card {
    grid-template-columns: 64px minmax(0, 1fr);
  }

  body[data-ui="dossier-premium"] .char-card img,
  body[data-ui="dossier-premium"] .char-card .monogram {
    width: 64px;
    height: 80px;
  }
}
</style>`;
let previousSnapshot = null;
const originalResponseJson = express.response.json;
const originalSendFile = express.response.sendFile;
const originalStatic = express.static;

express.static = function patchedStatic(root, options = {}) {
  return originalStatic(root, { ...options, index: false });
};

express.response.json = function patchedJson(payload) {
  let output = payload;
  try {
    const requestPath = this.req?.path || this.req?.originalUrl?.split("?")[0] || "";
    const isSceneResponse = ["/iniciar", "/accio", "/cargar"].includes(requestPath)
      && output
      && typeof output === "object"
      && !output.error
      && !output.cuaderno
      && (output.node_id || output.ubicacio || output.text);

    if (isSceneResponse) {
      const partida = typeof dm.obtenirPartidaWeb === "function" ? dm.obtenirPartidaWeb() : null;
      if (requestPath === "/iniciar") previousSnapshot = null;
      const enriched = enrichResponse(output, partida, {
        path: requestPath,
        previousSnapshot,
      });
      output = enriched.body;
      previousSnapshot = enriched.snapshot;
    }

  } catch (error) {
    console.error("[UI_CASE_STATE]", error?.message || error);
  }
  return originalResponseJson.call(this, output);
};

function versionAsset(html, asset) {
  const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(new RegExp(`${escaped}(?:\\?v=[^\"']+)?`, "g"), `${asset}?v=${UI_VERSION}`);
}

express.response.sendFile = function patchedSendFile(filePath, options, callback) {
  const absolutePath = String(filePath || "");
  if (path.basename(absolutePath).toLowerCase() === "index.html") {
    try {
      let html = fs.readFileSync(absolutePath, "utf8");
      html = versionAsset(html, "/prototip_v22.css");
      html = versionAsset(html, "/prototip_ui.css");
      html = versionAsset(html, "/prototip_v22.js");
      html = versionAsset(html, "/prototip_v22_patch.js");
      html = versionAsset(html, "/prototip_ui_runtime.js");
      html = versionAsset(html, "/prototipo-dossier-premium.css");
      html = versionAsset(html, "/prototipo-dossier-premium.js");
      html = html.replace("</head>", `${CHARACTER_PORTRAIT_STYLE}\n</head>`);
      this.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
      this.set("Pragma", "no-cache");
      this.set("X-Projecte-DM-UI", UI_VERSION);
      return this.type("html").send(html);
    } catch (error) {
      console.error("[UI_INDEX]", error?.message || error);
    }
  }
  return originalSendFile.call(this, filePath, options, callback);
};

require("./server.js");
