Add-Type -AssemblyName System.Drawing

$sourceLogo = Join-Path $PSScriptRoot "..\logo.png"
$resDir = Join-Path $PSScriptRoot "..\android\app\src\main\res"

if (-not (Test-Path $sourceLogo)) {
    Write-Error "No se encontro logo.png en $sourceLogo"
    exit 1
}

$original = [System.Drawing.Image]::FromFile((Resolve-Path $sourceLogo).Path)

function Save-ShieldIcon {
    param (
        [string]$DestPath,
        [int]$Size,
        [double]$PaddingRatio = 0.08,
        [bool]$FillDarkBackground = $true
    )

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($FillDarkBackground) {
        # Fondo azul marino oficial (#00142a) con bordes suaves pero sin recortar el escudo en circulo
        $bgColor = [System.Drawing.Color]::FromArgb(255, 0, 20, 42)
        $g.Clear($bgColor)
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    $pad = [int]([Math]::Round($Size * $PaddingRatio))
    $drawSize = $Size - ($pad * 2)

    $g.DrawImage($original, $pad, $pad, $drawSize, $drawSize)
    $g.Dispose()

    $dir = Split-Path -Parent $DestPath
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }
    $bmp.Save($DestPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

$mipmaps = @{
    "mipmap-mdpi"    = @{ launcher = 48;  foreground = 108 }
    "mipmap-hdpi"    = @{ launcher = 72;  foreground = 162 }
    "mipmap-xhdpi"   = @{ launcher = 96;  foreground = 216 }
    "mipmap-xxhdpi"  = @{ launcher = 144; foreground = 324 }
    "mipmap-xxxhdpi" = @{ launcher = 192; foreground = 432 }
}

foreach ($folder in $mipmaps.Keys) {
    $lSize = $mipmaps[$folder].launcher
    $fSize = $mipmaps[$folder].foreground
    $targetFolder = Join-Path $resDir $folder

    # Escudo completo sin recortar en circulo tanto en ic_launcher como en ic_launcher_round
    Save-ShieldIcon -DestPath (Join-Path $targetFolder "ic_launcher.png") -Size $lSize -PaddingRatio 0.04 -FillDarkBackground $false
    Save-ShieldIcon -DestPath (Join-Path $targetFolder "ic_launcher_round.png") -Size $lSize -PaddingRatio 0.04 -FillDarkBackground $false
    # En adaptive icon foreground usamos zona segura (~22% padding) para que Android nunca recorte las puntas del escudo
    Save-ShieldIcon -DestPath (Join-Path $targetFolder "ic_launcher_foreground.png") -Size $fSize -PaddingRatio 0.20 -FillDarkBackground $false
}

$original.Dispose()
Write-Output "Iconos de Android generados exitosamente con el escudo completo de logo.png."
