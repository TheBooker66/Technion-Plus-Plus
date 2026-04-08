import {defineConfig} from "vite";
import {resolve, dirname, basename} from "node:path";
import {viteStaticCopy} from "vite-plugin-static-copy";
import fs from "node:fs";
import {globSync} from "glob";
import {minify as minifyHTMLSVG} from "html-minifier-next";
import {transform as minifyCSS} from "lightningcss";
import archiver from "archiver";

function cleanPlugin(outDir: string) {
	return {
		name: "clean",
		buildStart() {
			const projectRoot = resolve(import.meta.dirname);
			const fullOut = resolve(projectRoot, outDir),
				zipOut = `${fullOut}.zip`,
				sourceZipOut = resolve(projectRoot, "source.zip");
			if (fs.existsSync(fullOut)) {
				console.log(`Removing existing output directory: ${fullOut}`);
				fs.rmSync(fullOut, {recursive: true, force: true});
			}
			if (fs.existsSync(zipOut)) {
				console.log(`Removing existing zip archive: ${zipOut}`);
				fs.rmSync(zipOut, {force: true});
			}
			if (fs.existsSync(sourceZipOut)) {
				console.log(`Removing existing source zip archive: ${sourceZipOut}`);
				fs.rmSync(sourceZipOut, {force: true});
			}
		},
	};
}

function copyPlugin(isProd: boolean) {
	return viteStaticCopy({
		targets: [
			{
				src: "src/html/**/*.html",
				dest: "html",
				rename: {stripBase: 2},
				async transform(contents) {
					if (!isProd) return contents;
					return minifyHTMLSVG(contents.toString(), {
						collapseWhitespace: true,
						conservativeCollapse: true,
						removeComments: true,
						minifyCSS: true,
						minifyJS: true,
					});
				},
			},
			{
				src: "src/css/**/*.css",
				dest: "css",
				rename: {stripBase: 2},
				async transform(contents, fullPath) {
					if (!isProd) return contents;
					const {code} = minifyCSS({
						filename: fullPath,
						code: Buffer.from(contents.toString()),
						minify: true,
					});
					return code.toString();
				},
			},
			{
				src: "src/icons/**/*.svg",
				dest: "icons",
				rename: {stripBase: 2},
				async transform(contents) {
					if (!isProd) return contents;
					return minifyHTMLSVG(contents.toString(), {
						collapseWhitespace: true,
						conservativeCollapse: true,
						removeComments: true,
						minifyCSS: true,
						minifyJS: true,
					});
				},
			},
			{
				src: "src/icons/**/*.png",
				dest: "icons",
				rename: {stripBase: 2},
			},
			{
				src: "src/resources/**/*",
				dest: "resources",
				rename: {stripBase: 2},
			},
			{
				src: "src/manifest.json",
				dest: ".",
				rename: {stripBase: 1},
			},
			{
				src: "node_modules/pdfjs-dist/build/pdf.min.mjs",
				dest: "lib/pdfjs",
				rename: {stripBase: true},
			},
			{
				src: "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
				dest: "lib/pdfjs",
				rename: {stripBase: true},
			},
		],
	});
}
function downloadPlugin(url: string, destRelative: string) {
	return {
		name: "download",
		async writeBundle(options: {dir: string}) {
			const outDir = options.dir;
			const fullDestPath = resolve(outDir, destRelative);

			console.log(`Downloading ${basename(destRelative)}...`);
			fs.mkdirSync(dirname(fullDestPath), {recursive: true});

			try {
				const response = await fetch(url);
				if (!response.ok) {
					throw new Error(`Download failed: ${response.status} ${response.statusText}`);
				}

				console.log(`Minifying ${basename(destRelative)}...`);
				fs.writeFileSync(fullDestPath, await response.text(), "utf8");
				console.log(`${basename(destRelative)} processed successfully.`);
			} catch (err) {
				console.error(`Failed to download or process ${basename(destRelative)}: ${err}`);
			}
		},
	};
}

function zipPlugin(outDir: string, isProd: boolean) {
	if (!isProd) return;

	return {
		name: "zip-bundle",
		async closeBundle() {
			const projectRoot = resolve(import.meta.dirname);
			const distOutput = fs.createWriteStream(resolve(projectRoot, `${outDir}.zip`)),
				sourceOutput = fs.createWriteStream(resolve(projectRoot, "source.zip"));
			const distArchiver = archiver("zip", {zlib: {level: 9}}),
				sourceArchiver = archiver("zip", {zlib: {level: 9}});

			new Promise<void>((res, rej) => {
				distOutput.on("close", () => {
					console.log(`\n📦 Zip complete. Total bytes: ${distArchiver.pointer()}.`);
					console.log(`Output archive written to: ${resolve(projectRoot, `${outDir}.zip`)}`);
					res();
				});
				distArchiver.on("error", rej);
				distArchiver.pipe(distOutput);
				distArchiver.directory(resolve(projectRoot, outDir), false);
				distArchiver.finalize();
			});

			new Promise<void>((res, rej) => {
				sourceOutput.on("close", () => {
					console.log(`\n📦 Source Zip complete. Total bytes: ${sourceArchiver.pointer()}.`);
					console.log(`Output archive written to: ${resolve(projectRoot, "source.zip")}`);
					res();
				});
				sourceArchiver.on("error", rej);
				sourceArchiver.pipe(sourceOutput);
				sourceArchiver.glob("**/*", {
					cwd: projectRoot,
					ignore: ["node_modules/**", `${outDir}/**`, `${outDir}.zip`, "source.zip"],
				});
				// create lib folder structure in source zip
				sourceArchiver.file(resolve(projectRoot, "node_modules/pdfjs-dist/build/pdf.min.mjs"), {
					name: "src/lib/pdfjs/pdf.min.mjs",
				});
				sourceArchiver.file(resolve(projectRoot, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"), {
					name: "src/lib/pdfjs/pdf.worker.min.mjs",
				});
				sourceArchiver.file(resolve(projectRoot, `${outDir}/lib/cheesefork/share-histograms.js`), {
					name: "src/lib/cheesefork/share-histograms.js",
				});
				sourceArchiver.finalize();
			});
		},
	};
}

const entryPoints = Object.fromEntries(
	globSync("src/js/**/*.ts", {ignore: "src/js/**/*.d.ts"}).map((file) => [
		basename(file, ".ts"),
		resolve(import.meta.dirname, file),
	])
);

export default defineConfig(({mode}) => {
	const isProd = mode === "production";
	const outDir = "dist";

	return {
		build: {
			outDir: outDir,
			sourcemap: !isProd,
			minify: isProd,
			rolldownOptions: {
				input: entryPoints,
				output: {
					entryFileNames: "js/[name].js",
					chunkFileNames: "js/[name]-[hash].js",
				},
			},
		},
		plugins: [
			cleanPlugin(outDir),
			copyPlugin(isProd),
			downloadPlugin(
				"https://raw.githubusercontent.com/michael-maltsev/cheese-fork/gh-pages/share-histograms.js",
				"lib/cheesefork/share-histograms.js"
			),
			zipPlugin(outDir, isProd),
		],
		resolve: {
			tsconfigPaths: true,
		},
		define: {
			"window.IS_PRODUCTION": JSON.stringify(isProd),
		},
		server: {
			forwardConsole: !isProd,
		},
	};
});
