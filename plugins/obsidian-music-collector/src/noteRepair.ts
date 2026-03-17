import { type App, Notice } from "obsidian";
import type { DiscogsCache, DiscogsRelease, MusicCollectorSettings } from "./types";

function sanitizeFilename(name: string): string {
	return name.replace(/[\\/:*?"<>|]/g, "").trim();
}

function resolveFilenameFormat(
	format: string,
	vars: Record<string, string>,
): string {
	return format.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
		return key in vars ? vars[key] : match;
	});
}

function buildVariableMap(
	release: DiscogsRelease,
	frontmatter: Record<string, any>,
): Record<string, string> {
	const dateAdded = release.dateAdded.split("T")[0];
	return {
		title: frontmatter.title ?? release.title,
		artist: frontmatter.artist ?? release.artist,
		mbid: frontmatter.mbid ?? "",
		type: frontmatter.type ?? "",
		released: frontmatter.released ?? "",
		purchased: dateAdded,
		dateAdded: dateAdded,
		discogsId: String(release.id),
	};
}

export async function repairNoteFrontmatter(
	app: App,
	settings: MusicCollectorSettings,
	discogsCache: DiscogsCache | null,
): Promise<void> {
	if (!discogsCache?.releases?.length) {
		new Notice("No Discogs cache available. Sync your collection first.");
		return;
	}

	const releaseMap = new Map<number, DiscogsRelease>();
	for (const r of discogsCache.releases) {
		releaseMap.set(r.id, r);
	}

	const folder = app.vault.getFolderByPath(settings.outputFolder);
	if (!folder) {
		new Notice(`Output folder "${settings.outputFolder}" not found.`);
		return;
	}

	const files = app.vault.getMarkdownFiles().filter(
		(f) => f.path.startsWith(settings.outputFolder + "/"),
	);

	const filenameFormat = settings.filenameFormat || "{{artist}} - {{title}}";
	let renamed = 0;
	let repaired = 0;
	let scanned = 0;

	for (const file of files) {
		const cache = app.metadataCache.getFileCache(file);
		const fm = cache?.frontmatter;
		if (!fm?.discogsId) continue;

		const release = releaseMap.get(Number(fm.discogsId));
		if (!release) continue;

		scanned++;
		const vars = buildVariableMap(release, fm);

		// Repair unreplaced template variables in frontmatter
		let content = await app.vault.read(file);
		let changed = false;

		for (const [key, value] of Object.entries(vars)) {
			const pattern = `"{{${key}}}"`;
			if (content.includes(pattern)) {
				content = content.split(pattern).join(`"${value}"`);
				changed = true;
			}
		}

		if (changed) {
			await app.vault.modify(file, content);
			repaired++;
		}

		// Rename file to match current filenameFormat
		const resolvedName = resolveFilenameFormat(filenameFormat, vars);
		const newBasename = sanitizeFilename(resolvedName);
		if (newBasename && file.basename !== newBasename) {
			const newPath = `${settings.outputFolder}/${newBasename}.md`;
			const existing = app.vault.getAbstractFileByPath(newPath);
			if (!existing) {
				await app.fileManager.renameFile(file, newPath);
				renamed++;
			}
		}
	}

	const parts: string[] = [];
	if (repaired > 0) parts.push(`repaired ${repaired}`);
	if (renamed > 0) parts.push(`renamed ${renamed}`);
	if (parts.length === 0) {
		new Notice(`Scanned ${scanned} notes. Nothing to update.`);
	} else {
		new Notice(`${parts.join(", ")} of ${scanned} notes.`);
	}
}
