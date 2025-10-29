import webpack from "webpack";
import path from "node:path";
import { promises as fs } from "node:fs";
import CopyPlugin from "copy-webpack-plugin";
import { fileURLToPath } from "node:url";
import * as terser from 'terser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const jsDir = path.join(srcDir, "js");

const cheeseforkSourceUrl =
    "https://raw.githubusercontent.com/michael-maltsev/cheese-fork/refs/heads/gh-pages/share-histograms.js";
const cheeseforkDestDir = path.join(rootDir, "dist", "lib", "cheesefork");

try {
    await fs.mkdir(cheeseforkDestDir, { recursive: true });

    const response = await fetch(cheeseforkSourceUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const scriptContent = await response.text();
    const minifiedResult = await terser.minify(scriptContent);
    await fs.writeFile(
        path.join(cheeseforkDestDir, "share-histograms.js"),
        minifiedResult.code
    );
    console.log("Downloaded Cheesefork library file.");
} catch (err) {
    console.error("Error: Failed to download remote JS file.", err);
    process.exit(1);
}

const config = {
    entry: {
        service_worker: path.join(jsDir, "service_worker.ts"),
        login_script: path.join(jsDir, "login_script.ts"),
        popup: path.join(jsDir, "popup.ts"),
        panopto: path.join(jsDir, "panopto.ts"),
        webcourse: path.join(jsDir, "webcourse.ts"),
        moodle: path.join(jsDir, "moodle.ts"),
        grades: path.join(jsDir, "grades.ts"),
        t_manager: path.join(jsDir, "t_manager.ts"),
        sap: path.join(jsDir, "sap.ts"),
        cs: path.join(jsDir, "cs.ts"),
        common_popup: path.join(jsDir, "common_popup.ts"),
        calculator: path.join(jsDir, "calculator.ts"),
        footer: path.join(jsDir, "footer.ts"),
        offscreen: path.join(jsDir, "offscreen.ts"),
        cal_moodle: path.join(jsDir, "cal_moodle.ts"),
        p_downloads: path.join(jsDir, "p_downloads.ts"),
        options: path.join(jsDir, "options.ts"),
        cal_cs: path.join(jsDir, "cal_cs.ts"),
        organizer: path.join(jsDir, "organizer.ts"),
        p_about: path.join(jsDir, "p_about.ts"),
        utils: path.join(jsDir, "utils.ts"),
        common_calendar: path.join(jsDir, "common_calendar.ts"),
        p_food: path.join(jsDir, "p_food.ts"),
        p_recordings: path.join(jsDir, "p_recordings.ts"),
        release_notes: path.join(jsDir, "release_notes.ts"),
        cal_webwork: path.join(jsDir, "cal_webwork.ts"),
    },
    output: {
        path: path.join(__dirname, "../dist/js"),
        filename: "[name].js",
        publicPath: "../js/",
        module: true,
        library: { type: "module" },
    },
    experiments: {
        outputModule: true,
    },
    optimization: {
        splitChunks: {
            name: "vendor",
            chunks(chunk) {
                return chunk.name !== "background";
            },
        },
    },
    performance: {
        hints: false,
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.html$/,
                loader: "html-loader",
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: path.join(srcDir, "css"), to: "../css" },
                { from: path.join(srcDir, "html"), to: "../html" },
                { from: path.join(srcDir, "icons"), to: "../icons" },
                { from: path.join(srcDir, "resources"), to: "../resources" },
                {
                    from: path.join(
                        __dirname,
                        "../node_modules/pdfjs-dist/build/pdf.min.mjs"
                    ),
                    to: "../lib/pdfjs/pdf.min.mjs",
                },
                {
                    from: path.join(
                        __dirname,
                        "../node_modules/pdfjs-dist/build/pdf.worker.min.mjs"
                    ),
                    to: "../lib/pdfjs/pdf.worker.min.mjs",
                },
                { from: path.join(srcDir, "manifest.json"), to: "../" },
            ],
            options: {},
        }),
    ],
};

export default config;
