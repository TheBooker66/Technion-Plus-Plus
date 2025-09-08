#region Initial Statements
# Developer mode
param(
    [switch]$DevMode
)

# Define excluded file patterns
$excludedFiles = @(
    "*lib\*"
)

# Define minifiable file extensions and commands
$minifyActions = @{
    "js" = {
        param([string]$Path)
        npx uglifyjs "$Path" --compress --mangle | Set-Content "$Path"
        Write-Host "Minified js: $( $Path )"
    }
    "html" = {
        param([string]$Path)
        npx html-minifier "$Path" --collapse-whitespace --conservative-collapse `
                                  --remove-comments --minify-css true --minify-js true | Set-Content "$Path"
        Write-Host "Minified html: $( $Path )"
    }
    "css" = {
        param([string]$Path)
        npx clean-css-cli "$Path" | Set-Content "$Path"
        Write-Host "Minified css: $( $Path )"
    }
    "svg" = {
        param([string]$Path)
        npx html-minifier "$Path" --collapse-whitespace --remove-comments --case-sensitive | Set-Content "$Path"
        Write-Host "Minified svg: $( $Path )"
    }
}
#endregion

#region Delete Previous Output Folder
# Define Output folder path
$outputfolder = Join-Path -Path (Get-Location).Path -ChildPath "dist"

# Delete previously minified folder if it exists
if (Test-Path -Path $outputfolder -PathType Container)
{
    Remove-Item -Path $outputfolder -Recurse -Force
    Write-Host "Removed old minified folder."
}

# Define zip file path
$zipFilePath = Join-Path -Path (Get-Location).Path -ChildPath "dist.zip"

# Delete previously zipped file if it exists
if (Test-Path -Path $zipFilePath)
{
    Remove-Item -Path $zipFilePath -Force
    Write-Host "Removed old zip file."
}
#endregion

#region Copy Other Files
# Use Robocopy to copy all other files, excluding .ts files, from the src directory to the output folder
$sourcePath = Join-Path -Path (Get-Location).Path -ChildPath "src"
robocopy $sourcePath $outputfolder /E /XF *.ts | Out-Null
Write-Host "Copied other files to minified folder."

# Library files location
$libDestPath = Join-Path -Path $outputfolder -ChildPath "lib"
New-Item -ItemType Directory -Path $libDestPath -Force | Out-Null

# Copy the pdfjs library files (pdf.min.mjs and pdf.worker.min.mjs)
$pdfjsSourcePath = Join-Path -Path (Get-Location).Path -ChildPath "node_modules/pdfjs-dist/build"
$pdfjsDestPath = Join-Path -Path $libDestPath -ChildPath "pdfjs"
New-Item -ItemType Directory -Path $pdfjsDestPath -Force | Out-Null
Copy-Item -Path (Join-Path -Path $pdfjsSourcePath -ChildPath "pdf.min.mjs") `
          -Destination (Join-Path -Path $pdfjsDestPath -ChildPath "pdf.min.mjs") -Force
Copy-Item -Path (Join-Path -Path $pdfjsSourcePath -ChildPath "pdf.worker.min.mjs") `
          -Destination (Join-Path -Path $pdfjsDestPath -ChildPath "pdf.worker.min.mjs") -Force
Write-Host "Copied pdfjs library files."

# Download CheeseFork file (share-histograms.js)
$cheeseforkSourceUrl = "https://raw.githubusercontent.com/michael-maltsev/cheese-fork/refs/heads/gh-pages/share-histograms.js"
$cheeseforkDestPath = Join-Path -Path $libDestPath -ChildPath "cheesefork"
New-Item -ItemType Directory -Path $cheeseforkDestPath -Force | Out-Null
Invoke-WebRequest -Uri $cheeseforkSourceUrl -OutFile (Join-Path -Path $cheeseforkDestPath -ChildPath "share-histograms.js") -UseBasicParsing
Write-Host "Downloaded Cheesefork library file."
#endregion

#region Typescript Compilation
# Check if developer mode is enabled
if ($DevMode)
{
    # Compile the entire TypeScript project with watch mode
    npx tsc --outDir $outputfolder --watch
    Write-Host "Running in developer mode, skipping minification and ziping."
    return
}

# Compile the entire TypeScript project regularly
npx tsc --outDir $outputfolder
Write-Host "Compiled TypeScript files."
#endregion

#region Minification
# Get all files recursively in the minified folder
$files = Get-ChildItem -Path $outputfolder -Recurse | Select-Object -ExpandProperty FullName

# Minify all the files
foreach ($file in $files)
{
    # Check if the file is an actual file
    if (!(Test-Path -Path $file -PathType Leaf))
    {
        Write-Host "Skipping folder: $( $file )"
        continue
    }

    # Check if the file should be excluded
    if ($excludedFiles | Where-Object { $file -like $_ })
    {
        Write-Host "Skipping excluded file: $( $file )"
        continue
    }

    # Check if the file is minifiable
    $extension = (Split-Path -Leaf $file).Split(".")[-1]
    if ( $minifyActions.ContainsKey($extension))
    {
        & $minifyActions[$extension] -Path $file
    }
}
#endregion

#region Zip Output
# Zip the minified folder
Compress-Archive -Path "$outputfolder\*" -DestinationPath $zipFilePath
Write-Host "Created zip archive: $( $zipFilePath )"
Write-Host "Finished! 🎉🎉🎉"
#endregion