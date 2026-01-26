# Split compression script
# Compresses directories and splits into chunks of max 50MB

param(
    [string]$SourceDir,
    [string]$OutputDir,
    [string]$ArchiveName,
    [int]$ChunkSizeMB = 50
)

$ErrorActionPreference = "Stop"

# Create temp directory
$tempDir = Join-Path $env:TEMP "compress_temp_$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    # First compress to temp location
    $tempZip = Join-Path $tempDir "$ArchiveName.zip"
    Write-Host "Compressing $SourceDir to temporary location..."
    Compress-Archive -Path $SourceDir -DestinationPath $tempZip -CompressionLevel Optimal -Force
    
    # Get file size
    $fileSize = (Get-Item $tempZip).Length
    $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
    Write-Host "Compressed size: $fileSizeMB MB"
    
    # Check if splitting is needed
    $chunkSizeBytes = $ChunkSizeMB * 1MB
    
    if ($fileSize -le $chunkSizeBytes) {
        # No splitting needed, just move the file
        Write-Host "File is smaller than $ChunkSizeMB MB, no splitting needed."
        $destFile = Join-Path $OutputDir "$ArchiveName.zip"
        Move-Item -Path $tempZip -Destination $destFile -Force
        Write-Host "Archive saved to: $destFile"
    } else {
        # Split the file
        Write-Host "File exceeds $ChunkSizeMB MB, splitting into chunks..."
        
        $fileStream = [System.IO.File]::OpenRead($tempZip)
        $buffer = New-Object byte[] $chunkSizeBytes
        $chunkIndex = 1
        
        while ($fileStream.Position -lt $fileStream.Length) {
            $chunkFile = Join-Path $OutputDir "$ArchiveName.z$('{0:D2}' -f $chunkIndex)"
            $chunkStream = [System.IO.File]::Create($chunkFile)
            
            $bytesRead = $fileStream.Read($buffer, 0, $buffer.Length)
            $chunkStream.Write($buffer, 0, $bytesRead)
            $chunkStream.Close()
            
            $chunkSizeMB = [math]::Round($bytesRead / 1MB, 2)
            Write-Host "Created chunk $chunkIndex : $chunkFile ($chunkSizeMB MB)"
            
            $chunkIndex++
        }
        
        $fileStream.Close()
        Write-Host "Split into $($chunkIndex - 1) chunks"
    }
    
    Write-Host "Compression completed successfully!"
    
} finally {
    # Clean up temp directory
    if (Test-Path $tempDir) {
        Remove-Item -Path $tempDir -Recurse -Force
    }
}
