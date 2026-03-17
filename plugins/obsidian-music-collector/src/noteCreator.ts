import { type App, Notice, TFile, requestUrl } from "obsidian";
import type { MusicCollectorSettings, SearchResult } from "./types";

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").trim();
}

async function downloadCoverArt(
  app: App,
  result: SearchResult,
  filepath: string,
): Promise<string | null> {
  if (!result.coverArtUrl) return null;
  try {
    // Request full-size cover art instead of the 250px thumbnail used in search
    const fullSizeUrl = result.coverArtUrl.replace(/\/front-\d+$/, "/front");
    const response = await requestUrl({ url: fullSizeUrl });
    const contentType = response.headers["content-type"] ?? "";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const coverName = sanitizeFilename(`${result.title} Cover Art`);
    const attachmentPath = await app.fileManager.getAvailablePathForAttachment(
      `${coverName}.${ext}`,
      filepath,
    );
    await app.vault.createBinary(attachmentPath, response.arrayBuffer);
    const basename = attachmentPath.split("/").pop() ?? `${coverName}.${ext}`;
    return basename;
  } catch (e) {
    console.error("Failed to download cover art:", e);
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function tryDownloadUrl(
  app: App,
  url: string,
  title: string,
  filepath: string,
): Promise<string | null> {
  const response = await withTimeout(requestUrl({ url }), 15000);
  const contentType = response.headers["content-type"] ?? "";
  const ext = contentType.includes("png") ? "png" : "jpg";
  const coverName = sanitizeFilename(`${title} Cover Art`);
  const attachmentPath = await app.fileManager.getAvailablePathForAttachment(
    `${coverName}.${ext}`,
    filepath,
  );
  const existing = app.vault.getAbstractFileByPath(attachmentPath);
  if (existing) {
    return attachmentPath.split("/").pop() ?? `${coverName}.${ext}`;
  }
  await app.vault.createBinary(attachmentPath, response.arrayBuffer);
  return attachmentPath.split("/").pop() ?? `${coverName}.${ext}`;
}

export async function downloadCoverArtCascade(
  app: App,
  mbid: string,
  title: string,
  filepath: string,
): Promise<string | null> {
  const base = `https://coverartarchive.org/release-group/${mbid}`;
  const urls = [`${base}/front`, `${base}/front-1200`, `${base}/front-500`];
  for (const url of urls) {
    try {
      return await tryDownloadUrl(app, url, title, filepath);
    } catch {
      // Try next size
    }
  }
  return null;
}

export interface CreateAlbumNoteOptions {
  openAfterCreate?: boolean;
  coverArtOverride?: string | null;
}

function getMusicReplacements(
  result: SearchResult,
  coverArt: string | null,
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    title: result.title,
    artist: result.artist,
    mbid: result.mbid,
    type: result.primaryType,
    released: result.firstReleaseDate,
    coverArt: coverArt ? `[[${coverArt}]]` : "",
    date: new Date().toISOString().split("T")[0],
    ...extra,
  };
}

function applyMusicVariables(
  template: string,
  replacements: Record<string, string>,
): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    return key in replacements ? replacements[key] : match;
  });
}

interface TemplaterPlugin {
  templater: {
    parse_template(
      config: {
        template_file: TFile | undefined;
        target_file: TFile;
        run_mode: number;
      },
      content: string,
    ): Promise<string>;
    create_running_config(
      template_file: TFile | undefined,
      target_file: TFile,
      run_mode: number,
    ): {
      template_file: TFile | undefined;
      target_file: TFile;
      run_mode: number;
    };
  };
}

function getTemplater(app: App): TemplaterPlugin | null {
  const tp = (app as any).plugins?.plugins?.["templater-obsidian"];
  if (tp?.templater?.parse_template) return tp as TemplaterPlugin;
  return null;
}

export async function createAlbumNote(
  app: App,
  result: SearchResult,
  settings: MusicCollectorSettings,
  extra: Record<string, string> = {},
  options: CreateAlbumNoteOptions = {},
): Promise<TFile | null> {
  const { openAfterCreate = true, coverArtOverride } = options;
  const { outputFolder, templatePath, filenameFormat } = settings;
  const replacements = getMusicReplacements(result, null, extra);
  const resolvedName = applyMusicVariables(
    filenameFormat || "{{artist}} - {{title}}",
    replacements,
  );
  const filename = sanitizeFilename(resolvedName) + ".md";
  const filepath = `${outputFolder}/${filename}`;

  const existing = app.vault.getAbstractFileByPath(filepath);
  if (existing) {
    if (openAfterCreate) {
      new Notice(`Note already exists: ${filename}`);
      const leaf = app.workspace.getLeaf(false);
      await leaf.openFile(existing as any);
    }
    return null;
  }

  try {
    await app.vault.createFolder(outputFolder);
  } catch {
    // folder already exists
  }

  const coverArt =
    coverArtOverride !== undefined
      ? coverArtOverride
      : await downloadCoverArt(app, result, filepath);
  const fullReplacements = getMusicReplacements(result, coverArt, extra);

  let content: string;
  const templateFile = templatePath
    ? app.vault.getAbstractFileByPath(templatePath)
    : null;

  if (templateFile instanceof TFile) {
    const template = await app.vault.read(templateFile);
    // Pre-substitute music variables, then let Templater handle tp.* syntax
    content = applyMusicVariables(template, fullReplacements);
  } else {
    if (templatePath) {
      new Notice(`Template not found: ${templatePath}. Using default.`);
    }
    content = applyMusicVariables(DEFAULT_TEMPLATE, fullReplacements);
  }

  let file: TFile;
  try {
    file = await app.vault.create(filepath, content);
  } catch {
    // File exists on disk but wasn't found by getAbstractFileByPath (cache lag)
    return null;
  }

  // If Templater is available, run its template engine on the new file
  const templater = getTemplater(app);
  if (templater) {
    try {
      const config = templater.templater.create_running_config(
        templateFile instanceof TFile ? templateFile : undefined,
        file,
        0, // RunMode.CreateNewFromTemplate
      );
      const parsed = await templater.templater.parse_template(config, content);
      await app.vault.modify(file, parsed);
    } catch (e) {
      console.error(
        "Templater processing failed, using pre-substituted content:",
        e,
      );
    }
  }

  if (openAfterCreate) {
    const leaf = app.workspace.getLeaf(false);
    await leaf.openFile(file);
  }
  new Notice(`Created: ${filename}`);
  return file;
}

const DEFAULT_TEMPLATE = `---
title: "{{title}}"
artist: "{{artist}}"
mbid: "{{mbid}}"
type: "{{type}}"
released: "{{released}}"
cover: "{{coverArt}}"
created: {{date}}
---
`;
