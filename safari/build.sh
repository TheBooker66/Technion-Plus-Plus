#!/bin/sh
# Build and sign a macOS Safari Web Extension using the active Xcode toolchain.
set -eu

safari_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$safari_dir/.."
npm run build:safari
build="$safari_dir/build"
mkdir -p "$build"
stage=$(mktemp -d "$build/staging.XXXXXXXX")
trap 'rm -rf "$stage"' EXIT
app_name='Technion++ for Safari.app'
app="$stage/$app_name"
extension="$app/Contents/PlugIns/Technion Plus Plus.appex"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources" \
    "$extension/Contents/MacOS" "$extension/Contents/Resources"

sdk=$(xcrun --sdk macosx --show-sdk-path)
minimum=$(plutil -extract LSMinimumSystemVersion raw "$safari_dir/App/Info.plist")
target="$(uname -m)-apple-macos$minimum"
xcrun --sdk macosx swiftc -sdk "$sdk" -target "$target" -O -parse-as-library \
    "$safari_dir/App/TechnionPlusPlusApp.swift" -o "$app/Contents/MacOS/TechnionPlusPlus"
xcrun --sdk macosx swiftc -sdk "$sdk" -target "$target" -O -parse-as-library \
    -application-extension -module-name TechnionPlusPlusExtension \
    -Xlinker -e -Xlinker _NSExtensionMain -framework Foundation \
    "$safari_dir/Extension/SafariWebExtensionHandler.swift" -o "$extension/Contents/MacOS/TechnionPlusPlusExtension"

cp "$safari_dir/App/Info.plist" "$app/Contents/Info.plist"
cp "$safari_dir/Extension/Info.plist" "$extension/Contents/Info.plist"
cp "$safari_dir/App/AppIcon.icns" LICENSE "$app/Contents/Resources/"
ditto --norsrc --noextattr dist/safari "$extension/Contents/Resources"
version=$(node -p "require('./dist/safari/manifest.json').version")
for bundle in "$app" "$extension"; do
    plutil -replace CFBundleShortVersionString -string "$version" "$bundle/Contents/Info.plist"
    plutil -replace CFBundleVersion -string "$version" "$bundle/Contents/Info.plist"
done

identity=${CODE_SIGN_IDENTITY:-Apple Development}
codesign --force --sign "$identity" --options runtime --timestamp=none \
    --entitlements "$safari_dir/Extension/Extension.entitlements" "$extension"
codesign --force --sign "$identity" --options runtime --timestamp=none \
    --entitlements "$safari_dir/App/App.entitlements" "$app"
codesign --verify --deep --strict "$app"

# Publish the verified bundle, preserving the previous build until it is ready.
if [ -d "$build/$app_name" ]; then
    mv "$build/$app_name" "$stage/previous.app"
fi
if ! mv "$app" "$build/$app_name"; then
    if [ -d "$stage/previous.app" ]; then mv "$stage/previous.app" "$build/$app_name"; fi
    exit 1
fi
printf 'Built %s\n' "$build/$app_name"
