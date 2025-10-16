#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Initial Statements ---

# Handle Developer mode
DEV_MODE=0
if [ "$1" == "--dev" ]; then
    DEV_MODE=1
fi

# Define excluded file patterns
EXCLUDED_PATTERNS="*lib*"

# --- Paths ---
# Define paths relative to the current working directory.
SRC_FOLDER="$(pwd)/src"
OUTPUT_FOLDER="$(pwd)/dist"
ZIP_FILE="$(pwd)/dist.zip"

# Function to safely (prevent race conditions) replace content in-place using a temporary file.
replace_in_place() {
    local FILE_PATH=$1
    local COMMAND=$2
    eval "$COMMAND" > "$FILE_PATH.tmp"
    mv "$FILE_PATH.tmp" "$FILE_PATH"
}

# Define minifiable file extensions and commands
minify_js() {
    local FILE_PATH=$1
    replace_in_place "$FILE_PATH" "npx uglifyjs \"$FILE_PATH\" --compress --mangle"
    echo "Minified js: $FILE_PATH"
}

minify_html() {
    local FILE_PATH=$1
    replace_in_place "$FILE_PATH" "npx html-minifier \"$FILE_PATH\" --collapse-whitespace --conservative-collapse --remove-comments --minify-css true --minify-js true"
    echo "Minified html: $FILE_PATH"
}

minify_css() {
    local FILE_PATH=$1
    replace_in_place "$FILE_PATH" "npx clean-css-cli \"$FILE_PATH\""
    echo "Minified css: $FILE_PATH"
}

minify_svg() {
    local FILE_PATH=$1
    replace_in_place "$FILE_PATH" "npx html-minifier \"$FILE_PATH\" --collapse-whitespace --remove-comments --case-sensitive"
    echo "Minified svg: $FILE_PATH"
}

# --- Delete Previous Output Folder ---

# Delete previously built files if they exist
if [ -d "$OUTPUT_FOLDER" ]; then
    rm -rf "${OUTPUT_FOLDER:?The output folder must be set}"/*
    echo "Removed old minified folder's contents."
fi

# Delete previously zipped file if it exists
if [ -f "$ZIP_FILE" ]; then
    rm -f "$ZIP_FILE"
    echo "Removed old zip file."
fi


# --- Copy Other Files ---

# Use rsync to copy all other files, excluding .ts files, from src to dist.
echo "Copying files from $SRC_FOLDER to $OUTPUT_FOLDER..."
rsync -a --exclude='*.ts' "$SRC_FOLDER/" "$OUTPUT_FOLDER"
echo "Copied other files to minified folder."

# Library files location
LIB_DEST_PATH="$OUTPUT_FOLDER/lib"
mkdir -p "$LIB_DEST_PATH"

# Copy the pdfjs library files
PDFJS_SOURCE_PATH="$(pwd)/node_modules/pdfjs-dist/build"
PDFJS_DEST_PATH="$LIB_DEST_PATH/pdfjs"
mkdir -p "$PDFJS_DEST_PATH"
cp -f "$PDFJS_SOURCE_PATH/pdf.min.mjs" "$PDFJS_DEST_PATH/pdf.min.mjs"
cp -f "$PDFJS_SOURCE_PATH/pdf.worker.min.mjs" "$PDFJS_DEST_PATH/pdf.worker.min.mjs"
echo "Copied pdfjs library files."

# Download CheeseFork file (share-histograms.js)
CHEESEFORK_SOURCE_URL="https://raw.githubusercontent.com/michael-maltsev/cheese-fork/refs/heads/gh-pages/share-histograms.js"
CHEESEFORK_DEST_PATH="$LIB_DEST_PATH/cheesefork"
mkdir -p "$CHEESEFORK_DEST_PATH"
curl -s -o "$CHEESEFORK_DEST_PATH/share-histograms.js" "$CHEESEFORK_SOURCE_URL"
echo "Downloaded Cheesefork library file."


# --- Typescript Compilation ---

# Check if developer mode is enabled
if [ "$DEV_MODE" -eq 1 ]; then
    # Compile the entire TypeScript project with watch mode
    npx tsc --outDir "$OUTPUT_FOLDER" --watch
    echo "Running in developer mode, skipping minification and zipping."
    exit 0
fi

# Otherwise, compile the entire TypeScript project regularly
npx tsc --outDir "$OUTPUT_FOLDER"
echo "Compiled TypeScript files."


# --- Minification ---

echo "Starting minification process..."

# Find all files recursively in the output folder (-type f)
find "$OUTPUT_FOLDER" -type f | while IFS= read -r file_path; do

    # Check if the file path contains an excluded pattern (*lib*)
    if [[ "$file_path" == "$EXCLUDED_PATTERNS" ]]; then
        echo "Skipping excluded file: $file_path"
        continue
    fi

    # Get the file extension
    filename=$(basename "$file_path")
    extension="${filename##*.}"

    # Check if the file is minifiable
    case "$extension" in
        js)
            minify_js "$file_path"
            ;;
        html)
            minify_html "$file_path"
            ;;
        css)
            minify_css "$file_path"
            ;;
        svg)
            minify_svg "$file_path"
            ;;
        *)
            echo "Skipping file with extension: .$extension ($file_path)"
            ;;
    esac

done


# --- Zip Output ---

# Zip the contents of the minified folder into the zip file path.
cd "$OUTPUT_FOLDER"
zip -r "$ZIP_FILE" .

echo "Created zip archive: $ZIP_FILE"
echo "Finished! 🎉🎉🎉"
