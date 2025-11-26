// noinspection JSUnusedGlobalSymbols

import {defineConfig} from "vite";
import {resolve, relative, dirname, basename, extname} from "node:path";
import {fileURLToPath} from "node:url";
import {viteStaticCopy} from "vite-plugin-static-copy";
import fs from "node:fs";
import {globSync} from "glob";
import {minify as minifyJS} from "terser";
import {minify as minifyHTMLSVG} from "html-minifier-next";
import {transform as minifyCSS} from "lightningcss";
import archiver from "archiver";


function cleanPlugin(outDir: string) {
	return {
		name: "clean",
		buildStart() {
			const projectRoot = resolve(import.meta.dirname);
			const fullOut = resolve(projectRoot, outDir),
				zipOut = fullOut + ".zip",
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

function downloadPlugin(url: string, destRelative: string, isProd: boolean) {
	return {
		name: "download",
		async writeBundle(options: { dir?: string }) {
			const outDir = options.dir;
			const fullDestPath = resolve(outDir, destRelative);

			console.log(`Downloading ${basename(destRelative)}...`);
			fs.mkdirSync(dirname(fullDestPath), {recursive: true});

			try {
				const response = await fetch(url);
				if (!response.ok) {
					throw new Error(`Download failed with status: ${response.status} ${response.statusText}`);
				}

				let finalCode = await response.text();

				if (isProd) {
					console.log(`Minifying ${basename(destRelative)}...`);
					const result = await minifyJS(finalCode);
					finalCode = result.code ?? "";
				}

				fs.writeFileSync(fullDestPath, finalCode, "utf8");
				console.log(`${basename(destRelative)} processed successfully.`);

			} catch (err) {
				this.error(`Failed to download or process ${basename(destRelative)}: ${err.message}`);
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
			const distOutput = fs.createWriteStream(resolve(projectRoot, outDir + ".zip")),
				sourceOutput = fs.createWriteStream(resolve(projectRoot, "source.zip"));
			const distArchiver = archiver("zip", {
				zlib: {level: 9},
			}), sourceArchiver = archiver("zip", {
				zlib: {level: 9},
			});

			new Promise<void>((resolvePromise, reject) => {
				distOutput.on("close", () => {
					console.log(`\n📦 Zip complete. Total bytes: ${distArchiver.pointer()}.`);
					console.log(`Output archive written to: ${resolve(projectRoot, outDir + ".zip")}`);
					resolvePromise();
				});

				distArchiver.on("error", (err) => {
					reject(err);
				});

				distArchiver.pipe(distOutput);
				distArchiver.directory(resolve(projectRoot, outDir), false);
				distArchiver.finalize();
			});

			new Promise<void>((resolvePromise, reject) => {
				sourceOutput.on("close", () => {
					console.log(`\n📦 Source Zip complete. Total bytes: ${sourceArchiver.pointer()}.`);
					console.log(`Output archive written to: ${resolve(projectRoot, "source.zip")}`);
					resolvePromise();
				});

				sourceArchiver.on("error", (err) => {
					reject(err);
				});

				sourceArchiver.pipe(sourceOutput);
				sourceArchiver.glob("**/*", {
					cwd: projectRoot,
					ignore: [
						".git**", ".idea/**", "node_modules/**", "package-lock.json",
						outDir + "/**", outDir + ".zip", "source.zip",
					],
				});
				// create lib folder structure in source zip
				sourceArchiver.file(resolve(projectRoot, "node_modules/pdfjs-dist/build/pdf.min.mjs"), {name: "src/lib/pdfjs/pdf.min.mjs"});
				sourceArchiver.file(resolve(projectRoot, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"), {name: "src/lib/pdfjs/pdf.worker.min.mjs"});
				sourceArchiver.file(resolve(projectRoot, outDir + "/lib/cheesefork/share-histograms.js"), {name: "src/lib/cheesefork/share-histograms.js"});
				sourceArchiver.finalize();
			});
		},
	};
}

const entryPoints = Object.fromEntries(
	globSync("src/js/**/*.ts", {ignore: "src/js/**/*.d.ts"}).map((file) => [
		basename(file, extname(file)),
		fileURLToPath(new URL(file, import.meta.url)),
	]),
);

export default defineConfig(({mode}) => {
	const isProd = mode === "production";
	const outDir = "dist";

	return {
		build: {
			outDir: outDir,
			emptyOutDir: true,
			sourcemap: !isProd,
			minify: isProd ? "terser" : false,
			terserOptions: isProd ? {compress: {drop_console: false}} : undefined,
			cssMinify: isProd,
			rollupOptions: {
				input: entryPoints,
				output: {
					entryFileNames: "js/[name].js",
					chunkFileNames: "js/chunks/[name]-[hash].js",
				},
			},
		},
		plugins: [
			cleanPlugin(
				outDir,
			),
			viteStaticCopy({
				targets: [
					{
						src: "src/html/**/*.html",
						dest: "html",
						rename: (_, __, fullPath) => {
							return relative(resolve(import.meta.dirname, "src/html"), fullPath);
						},
						transform: (contents) =>
							isProd ? minifyHTMLSVG(contents.toString(), {
								collapseWhitespace: true,
								conservativeCollapse: true,
								removeComments: true,
								minifyCSS: true,
								minifyJS: true,
							}) : contents,
					},
					{
						src: "src/css/**/*.css",
						dest: "css",
						rename: (_, __, fullPath) => {
							return relative(resolve(import.meta.dirname, "src/css"), fullPath);
						},
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
						rename: (_, __, fullPath) => {
							return relative(resolve(import.meta.dirname, "src/icons"), fullPath);
						},
						transform: (contents) =>
							isProd ? minifyHTMLSVG(contents.toString(), {
								collapseWhitespace: true,
								conservativeCollapse: true,
								removeComments: true,
								minifyCSS: true,
								minifyJS: true,
							}) : contents,
					},
					{
						src: "src/icons/**/*.png",
						dest: "icons",
						rename: (_, __, fullPath) => {
							return relative(resolve(import.meta.dirname, "src/icons"), fullPath);
						},
					},
					{src: "src/resources/**/*", dest: "resources"},
					{src: "src/manifest.json", dest: "."},
					{src: "node_modules/pdfjs-dist/build/pdf.min.mjs", dest: "lib/pdfjs"},
					{src: "node_modules/pdfjs-dist/build/pdf.worker.min.mjs", dest: "lib/pdfjs"},
				],
			}),
			downloadPlugin(
				"https://raw.githubusercontent.com/michael-maltsev/cheese-fork/gh-pages/share-histograms.js",
				"lib/cheesefork/share-histograms.js",
				isProd,
			),
			zipPlugin(
				outDir,
				isProd,
			),
		],
		resolve: {
			alias: {
				"@": resolve(import.meta.dirname, "src"),
			},
		},
		define: {
			"window.IS_PRODUCTION": JSON.stringify(isProd),
		},
	};
});
