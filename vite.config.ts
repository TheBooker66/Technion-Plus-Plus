import { defineConfig } from "vite";
import { resolve, relative, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { viteStaticCopy } from "vite-plugin-static-copy";
import https from "node:https";
import fs from "node:fs";
import { minify as minifyHtml } from "html-minifier-terser";
import { globSync } from "glob";
import { transform as lightningTransform } from "lightningcss";
import { minify as terserMinify } from "terser";

function downloadPlugin(url: string, destRelative: string, isProd: boolean) {
    return {
        name: "download",
        async writeBundle(options: { dir?: string }) {
            const outDir = options.dir;
            if (!outDir) {
                this.error("Output directory is not defined. Cannot download file.");
                return;
            }
            const fullDestPath = resolve(outDir, destRelative);

            console.log(`Downloading ${basename(destRelative)}...`);
            fs.mkdirSync(dirname(fullDestPath), { recursive: true });

            await new Promise<void>((resolvePromise, reject) => {
                https.get(url, (res) => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`Download failed with status: ${res.statusCode}`));
                        return;
                    }

                    let rawData = "";
                    res.on("data", (chunk) => { rawData += chunk; });
                    res.on("end", async () => {
                        try {
                            let finalCode = rawData;
                            if (isProd) {
                                console.log(`Minifying ${basename(destRelative)}...`);
                                const result = await terserMinify(rawData);
                                finalCode = result.code ?? "";
                            }
                            fs.writeFileSync(fullDestPath, finalCode);
                            console.log(`${basename(destRelative)} processed successfully.`);
                            resolvePromise();
                        } catch (err) {
                            reject(err);
                        }
                    });
                }).on("error", (err) => {
                    reject(err);
                });
            });
        },
    };
}

const entryPoints = Object.fromEntries(
    globSync("src/js/**/*.ts", { ignore: "src/js/**/*.d.ts" }).map((file) => [
        basename(file, extname(file)),
        fileURLToPath(new URL(file, import.meta.url)),
    ])
);

export default defineConfig(({ mode }) => {
    const isProd = mode === "production";

    return {
        build: {
            outDir: "dist",
            emptyOutDir: true,
            sourcemap: !isProd,
            minify: isProd ? "terser" : false,
            terserOptions: isProd ? { compress: { drop_console: false } } : undefined,
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
            downloadPlugin(
                "https://raw.githubusercontent.com/michael-maltsev/cheese-fork/gh-pages/share-histograms.js",
                "lib/cheesefork/share-histograms.js",
                isProd
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
                            isProd ? minifyHtml(contents.toString(), {
                                collapseWhitespace: true,
                                conservativeCollapse: true,
                                removeComments: true,
                            }) : contents,
                    },
                    {
                        src: "src/css/**/*.css",
                        dest: "css",
                        rename: (_, __, fullPath) => {
                            return relative(resolve(import.meta.dirname, "src/css"), fullPath);
                        },
                        async transform(contents, fullPath) {
                            if (!isProd) {
                                return contents;
                            }
                            const { code } = lightningTransform({
                                filename: fullPath,
                                code: Buffer.from(contents.toString()),
                                minify: true,
                            });
                            return code.toString();
                        },
                    },
                    { src: "src/icons/**/*", dest: "icons" },
                    { src: "src/resources/**/*", dest: "resources" },
                    { src: "src/manifest.json", dest: "." },
                    { src: "node_modules/pdfjs-dist/build/pdf.min.mjs", dest: "lib/pdfjs" },
                    { src: "node_modules/pdfjs-dist/build/pdf.worker.min.mjs", dest: "lib/pdfjs" },
                ],
            }),
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
