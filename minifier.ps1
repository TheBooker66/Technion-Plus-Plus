#region Initial Statements
# Define excluded file patterns
$excludedFiles = @(
    "*webwork.svg"
    "*paypal_logo.svg"
    "*share-histograms.js"
    "*pdf.mjs"
    "*pdf.worker.mjs"
)

# Define minifiable file extensions and commands
$minifyActions = @{
    "js" = {
        param([string]$InputPath, [string]$OutputPath)
        npx uglifyjs "$InputPath" -o "$OutputPath" --compress --mangle
        Write-Host "Minified js: $( $OutputPath )"
    }
    "html" = {
        param([string]$InputPath, [string]$OutputPath)
        npx html-minifier "$InputPath" -o "$OutputPath" --collapse-whitespace --remove-comments `
            --remove-tag-whitespace --use-short-doctype --minify-css true --minify-js true
        Write-Host "Minified html: $( $OutputPath )"
    }
    "css" = {
        param([string]$InputPath, [string]$OutputPath)
        npx clean-css-cli -o "$OutputPath" "$InputPath"
        Write-Host "Minified css: $( $OutputPath )"
    }
    "svg" = {
        param([string]$InputPath, [string]$OutputPath)
        npx html-minifier "$InputPath" -o "$OutputPath" --collapse-whitespace --remove-comments --case-sensitive
        Write-Host "Minified svg: $( $OutputPath )"
    }
}
#endregion

#region Prepare Output Folder
# Set Output folder
$outputfolder = Join-Path -Path (Get-Location).Path -ChildPath "minified"

# Delete previously minified folder if it exists
if (Test-Path -Path $outputfolder -PathType Container)
{
    Remove-Item -Path $outputfolder -Recurse -Force
    Write-Host "Removed old minified folder."
}
#endregion

#region File Processing
# Get all files recursively from source folder
$cwd = Join-Path -Path (Get-Location).Path -ChildPath "src"
$files = Get-ChildItem -Path $cwd -Recurse | Select-Object -ExpandProperty FullName

# Process each file
foreach ($file in $files)
{
    # Determine output path using relative path from source folder
    $relativePath = (Resolve-Path -Relative -Path $file).Replace(".\src\", "")
    $outputPath = Join-Path -Path $outputfolder -ChildPath $relativePath

    # Check if the file should be excluded
    if ($excludedFiles | Where-Object { $file -like $_ })
    {
        Copy-Item -Path $file -Destination $outputPath
        Write-Host "Copied excluded file: $( $outputPath )"
        continue
    }

    # Check if the file is an actual file
    if (Test-Path -Path $file -PathType Leaf)
    {
        $extension = (Split-Path -Leaf $file).Split(".")[-1]
        # Minify if file type is minifiable
        if ($minifyActions.ContainsKey($extension))
        {
            & $minifyActions[$extension] -InputPath $file -OutputPath $outputPath
        }
        # Copy if file not minifiable
        else
        {
            Copy-Item -Path $file -Destination $outputPath
            Write-Host "Copied file: $( $outputPath )"
        }
    }
    # Copy folders
    else
    {
        Copy-Item -Path $file -Destination $outputPath -Container # Use -Container for folders explicitly
        Write-Host "Copied folder: $( $outputPath )"
    }
}
#endregion

#region Zip Output
# Define zip file path
$zipFilePath = Join-Path -Path (Get-Location).Path -ChildPath "minified.zip"

# Delete previously zipped file if it exists
if (Test-Path -Path $zipFilePath)
{
    Remove-Item -Path $zipFilePath -Force
    Write-Host "Removed old zip file."
}

# Zip the minified folder
Compress-Archive -Path "$outputfolder\*" -DestinationPath $zipFilePath
Write-Host "Created zip archive: $( $zipFilePath )"
#endregion