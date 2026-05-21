# Generates PWA icon PNGs using System.Drawing (no external deps).
# Run from anywhere:  pwsh tools/build-icons.ps1

Add-Type -AssemblyName System.Drawing

$root    = Split-Path -Parent $PSScriptRoot
$iconDir = Join-Path $root 'icons'
if (-not (Test-Path $iconDir)) { New-Item -ItemType Directory -Path $iconDir | Out-Null }

function New-DdpIcon {
    param(
        [int]$Size,
        [string]$OutPath,
        [double]$SafePadRatio = 0.0
    )

    $bmp = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Background: rounded rect, deep slate
    $corner = [int]($Size * 0.19)
    $path   = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc(0, 0, ($corner * 2), ($corner * 2), 180, 90)
    $path.AddArc(($Size - $corner * 2), 0, ($corner * 2), ($corner * 2), 270, 90)
    $path.AddArc(($Size - $corner * 2), ($Size - $corner * 2), ($corner * 2), ($corner * 2), 0, 90)
    $path.AddArc(0, ($Size - $corner * 2), ($corner * 2), ($corner * 2), 90, 90)
    $path.CloseAllFigures()

    $bgColor = [System.Drawing.Color]::FromArgb(255, 15, 23, 42)
    $bgBrush = New-Object System.Drawing.SolidBrush $bgColor
    $g.FillPath($bgBrush, $path)
    $bgBrush.Dispose()
    $path.Dispose()

    # Safe zone (for maskable icons, content stays inside central 80%)
    $safeScale = 1.0 - (2.0 * $SafePadRatio)
    $g.TranslateTransform([single]($Size / 2.0), [single]($Size / 2.0))
    $g.ScaleTransform([single]$safeScale, [single]$safeScale)

    # Utensils: amber
    $amber = [System.Drawing.Color]::FromArgb(255, 252, 211, 77)
    $utensilBrush = New-Object System.Drawing.SolidBrush $amber
    $unit = $Size / 512.0

    # Fork (left)
    $forkX = -78.0 * $unit
    foreach ($offset in @(-45.0, -15.0, 15.0, 45.0)) {
        $tine = New-Object System.Drawing.RectangleF (
            [single]($forkX + ($offset - 7) * $unit),
            [single](-150 * $unit),
            [single](14 * $unit),
            [single](78 * $unit))
        $g.FillRectangle($utensilBrush, $tine)
    }
    $shank = New-Object System.Drawing.RectangleF (
        [single]($forkX - 32 * $unit), [single](-82 * $unit),
        [single](64 * $unit),           [single](24 * $unit))
    $g.FillRectangle($utensilBrush, $shank)
    $forkHandle = New-Object System.Drawing.RectangleF (
        [single]($forkX - 14 * $unit), [single](-62 * $unit),
        [single](28 * $unit),           [single](200 * $unit))
    $g.FillRectangle($utensilBrush, $forkHandle)

    # Spoon (right)
    $spoonX = 78.0 * $unit
    $spoonBowl = New-Object System.Drawing.RectangleF (
        [single]($spoonX - 50 * $unit), [single](-150 * $unit),
        [single](100 * $unit),           [single](130 * $unit))
    $g.FillEllipse($utensilBrush, $spoonBowl)
    $spoonHandle = New-Object System.Drawing.RectangleF (
        [single]($spoonX - 14 * $unit), [single](-50 * $unit),
        [single](28 * $unit),            [single](190 * $unit))
    $g.FillRectangle($utensilBrush, $spoonHandle)

    $utensilBrush.Dispose()

    # "D D P" label
    $g.ResetTransform()
    $fontSize = [single]($Size * 0.115)
    $font = New-Object System.Drawing.Font 'Segoe UI', $fontSize, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
    $textBrush = New-Object System.Drawing.SolidBrush $amber
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment     = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $padY = [single]($Size * $SafePadRatio)
    $textRect = New-Object System.Drawing.RectangleF ([single]0), ([single]($Size * 0.74 - $padY)), ([single]$Size), ([single]($Size * 0.18))
    $g.DrawString('D D P', $font, $textBrush, $textRect, $sf)
    $font.Dispose()
    $textBrush.Dispose()
    $sf.Dispose()

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Wrote $OutPath ($Size x $Size)"
}

New-DdpIcon -Size 192 -OutPath (Join-Path $iconDir 'icon-192.png')
New-DdpIcon -Size 512 -OutPath (Join-Path $iconDir 'icon-512.png')
New-DdpIcon -Size 512 -OutPath (Join-Path $iconDir 'icon-512-maskable.png') -SafePadRatio 0.10
New-DdpIcon -Size 180 -OutPath (Join-Path $root 'apple-touch-icon.png')

Write-Host "All icons written."
