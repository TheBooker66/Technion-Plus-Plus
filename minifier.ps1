# Get all files to minify
$cwd = Join-Path -Path (Get-Location).Path -ChildPath "src"
$files = Get-ChildItem -Path $cwd -Recurse | Select-Object -ExpandProperty FullName

# Delete previously minified folder
$folderPath = Join-Path -Path (Get-Location).Path -ChildPath "minified"
if (Test-Path -Path $folderPath -PathType Container) {
    Remove-Item -Path $folderPath -Recurse -Force
    Write-Host "Folder '$folderPath' deleted successfully."
}

# Loop through all the files
foreach ($file in $files)
{
    # Skip the webwork and paypal logo svg files, because they are proprietary,
    # and the share-histograms javascript file, out of respect for Michael Maltsev
    if ($file -like "*webwork.svg" -or $file -like "*paypal_logo.svg" -or $file -like "*share-histograms.js")
    {
        Write-Host "Skipped: $( $file )"
        continue
    }

    # Figure out where to save the file (the 4 is to remove the "src\" part of the path)
    $outputPath = Join-Path -Path $folderPath -ChildPath $file.Substring((Get-Location).Path.Length + 4)

    # Check if the file is actually a file or a folder
    if (Test-Path -Path $file -PathType Leaf)
    {
        # Minify all minifiable files and copy all other files
        switch ((Split-Path -Leaf $file).Split(".")[-1])
        {
            "js" {
                uglifyjs $file -o $outputPath --compress --mangle
                Write-Host "Minified js: $( $outputPath )"
            }
            "html" {
                html-minifier $file -o $outputPath --collapse-whitespace --remove-comments --remove-tag-whitespace --use-short-doctype --minify-css true --minify-js true
                Write-Host "Minified html: $( $outputPath )"
            }
            "css" {
                cleancss -o $outputPath $file
                Write-Host "Minified css: $( $outputPath )"
            }
            "svg" {
                html-minifier $file -o $outputPath --collapse-whitespace --remove-comments --case-sensitive
                Write-Host "Minified svg: $( $outputPath )"
            }
            default {
                Copy-Item -Path $file -Destination $outputPath
                Write-Host "Copied Random: $( $outputPath )"
            }
        }
    }
    else
    {
        Copy-Item -Path $file -Destination $outputPath -Recurse
        Write-Host "Copied folder: $( $outputPath )"
    }
}

# Delete previously zipped folder
$outputPath = $cwd.Replace("\src", "\minified.zip")
if (Test-Path -Path $outputPath)
{
    Remove-Item -Path $outputPath -Force
    Write-Host "File '$outputPath' deleted successfully."
}

# Zip the folder
Compress-Archive -Path $cwd.Replace("\src", "\minified\*") -DestinationPath $outputPath
Write-Host "Zipped folder: $( $outputPath )"