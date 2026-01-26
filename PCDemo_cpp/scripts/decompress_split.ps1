# Split decompression script
# Decompresses split archives or regular zip files

param(
    [string]$SourceDir,
    [string]$OutputDir,
    [string]$ArchiveName
)

$ErrorActionPreference = "Stop"

# Check if split files exist
$firstChunk = Join-Path $SourceDir "$ArchiveName.z01"
$regularZip = Join-Path $SourceDir "$ArchiveName.zip"

if (Test-Path $firstChunk) {
    # Split archive exists, need to merge first
    Write-Host "Found split archive for $ArchiveName, merging chunks..."
    
    # Create temp directory
    $tempDir = Join-Path $env:TEMP "decompress_temp_$(Get-Random)"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    
    try {
        # Merge all chunks
        $mergedZip = Join-Path $tempDir "$ArchiveName.zip"
        $outputStream = [System.IO.File]::Create($mergedZip)
        
        $chunkIndex = 1
        while ($true) {
            $chunkFile = Join-Path $SourceDir "$ArchiveName.z$('{0:D2}' -f $chunkIndex)"
            
            if (-not (Test-Path $chunkFile)) {
                break
            }
            
            Write-Host "Merging chunk $chunkIndex : $chunkFile"
            $chunkBytes = [System.IO.File]::ReadAllBytes($chunkFile)
            $outputStream.Write($chunkBytes, 0, $chunkBytes.Length)
            
            $chunkIndex++
        }
        
        $outputStream.Close()
        Write-Host "Merged $($chunkIndex - 1) chunks into temporary archive"
        
        # Extract the merged archive
        Write-Host "Extracting $ArchiveName to $OutputDir..."
        Expand-Archive -Path $mergedZip -DestinationPath $OutputDir -Force
        Write-Host "Extraction completed successfully!"
        
    } finally {
        # Clean up temp directory
        if (Test-Path $tempDir) {
            Remove-Item -Path $tempDir -Recurse -Force
        }
    }
    
} elseif (Test-Path $regularZip) {
    # Regular zip file, just extract
    Write-Host "Found regular archive for $ArchiveName, extracting..."
    Expand-Archive -Path $regularZip -DestinationPath $OutputDir -Force
    Write-Host "Extraction completed successfully!"
    
} else {
    Write-Host "ERROR: No archive found for $ArchiveName in $SourceDir"
    exit 1
}
