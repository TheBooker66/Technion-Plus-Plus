# Get all files in the current directory
$js_files = Get-ChildItem -Path .,.\js\,.\cheesefork\ -Filter "*.js" | Select-Object -ExpandProperty FullName
$html_files = Get-ChildItem -Path .,.\html\,.\html\templates -Filter "*.html" | Select-Object -ExpandProperty FullName
$css_files = Get-ChildItem -Path .\css\,.\css\moodle\ -Filter "*.css" | Select-Object -ExpandProperty FullName
$svg_files = Get-ChildItem -Path .\icons\,.\icons\panopto_icons,.\icons\release_notes -Filter "*.svg" | Select-Object -ExpandProperty FullName

# Loop through all the files and minify them
foreach ($file in $js_files)
{
    uglifyjs $file -o $file --compress --mangle
    Write-Host "Minified-js: $( $file )"
}
foreach ($file in $html_files)
{
    html-minifier --collapse-whitespace --remove-comments --remove-tag-whitespace --use-short-doctype --minify-css true --minify-js true $file -o $file
    Write-Host "Minified-html: $( $file )"
}
foreach ($file in $css_files)
{
    cleancss -o $file $file
    Write-Host "Minified-css: $( $file )"
}
foreach ($file in $svg_files)
{
    # Skip the webwork and paypal logo svg files, because they are proprietary
    if ($file -like "*webwork.svg" -or $file -like "*paypal_logo.svg")
    {
        continue
    }
    html-minifier --collapse-whitespace --remove-comments --case-sensitive $file -o $file
    Write-Host "Minified-svg: $( $file )"
}