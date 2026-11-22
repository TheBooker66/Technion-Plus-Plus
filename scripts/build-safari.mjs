import {Buffer} from "node:buffer";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {cp, mkdir, mkdtemp, readFile, rename, rm, writeFile} from "node:fs/promises";
import {join} from "node:path";
import process from "node:process";
import {fileURLToPath} from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = join(root, "dist");
await mkdir(dist, {recursive: true});
const stage = await mkdtemp(join(dist, ".safari-"));

const histogramFile = "lib/cheesefork/share-histograms.js";
async function histogramScript() {
	const expected = "07a16faf1a16babf9e618970dcc6b642a4a425833896d6c18f4ad8a90117313b";
	const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
	const cached = await readFile(join(dist, "safari", histogramFile)).catch((error) => {
		if (error.code !== "ENOENT") throw error;
	});
	if (cached && digest(cached) === expected) return cached;
	const revision = "38ce4b380dbabfdc51912ebd3036d9e51de2990f";
	const response = await fetch(
		`https://raw.githubusercontent.com/michael-maltsev/cheese-fork/${revision}/share-histograms.js`
	);
	if (!response.ok) throw new Error(`CheeseFork asset download failed with HTTP ${response.status}`);
	const script = Buffer.from(await response.arrayBuffer());
	if (digest(script) !== expected) throw new Error("Unexpected CheeseFork asset digest");
	return script;
}

try {
	// Content scripts are classic scripts. Extension pages load the same native ES modules as upstream.
	execFileSync(
		process.execPath,
		[
			"node_modules/typescript/bin/tsc",
			"--project",
			"tsconfig.json",
			"--moduleDetection",
			"legacy",
			"--noEmitOnError",
			"--rootDir",
			"src/js",
			"--outDir",
			join(stage, "js"),
		],
		{cwd: root, stdio: "inherit"}
	);

	for (const dir of ["html", "css", "icons", "resources"]) {
		await cp(join(root, "src", dir), join(stage, dir), {recursive: true});
	}
	const manifest = JSON.parse(await readFile(join(root, "src/manifest.json"), "utf8"));
	delete manifest.minimum_chrome_version;
	manifest.browser_specific_settings = {safari: {strict_min_version: "18.0"}};
	manifest.background = {page: "html/safari_background.html", persistent: false};
	manifest.permissions = manifest.permissions.filter(
		(key) => !["offscreen", "downloads", "notifications"].includes(key)
	);
	manifest.permissions.push("nativeMessaging");
	manifest.incognito = "not_allowed";
	// The recordings search retrieves its catalogue from this upstream database.
	manifest.host_permissions.push("https://12041543-fd22-49b6-bf91-5fa9cf6046b2-bluemix.cloudant.com/*");
	await writeFile(join(stage, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

	await mkdir(join(stage, "lib/pdfjs"), {recursive: true});
	for (const file of ["pdf.min.mjs", "pdf.worker.min.mjs"]) {
		await cp(join(root, "node_modules/pdfjs-dist/build", file), join(stage, "lib/pdfjs", file));
	}

	await mkdir(join(stage, "lib/cheesefork"), {recursive: true});
	await writeFile(join(stage, histogramFile), await histogramScript());
	await rm(join(dist, "safari"), {recursive: true, force: true});
	await rename(stage, join(dist, "safari"));
	console.log("Built Safari Web Extension resources in dist/safari.");
} finally {
	await rm(stage, {recursive: true, force: true});
}
