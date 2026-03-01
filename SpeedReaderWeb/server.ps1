$path = "d:\antygravity\read\SpeedReaderWeb"
$listener = New-Object Net.HttpListener
$listener.Prefixes.Add("http://localhost:8000/")
$listener.Start()
Write-Host "Listening on http://localhost:8000/"
while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/") { $localPath = "/index.html" }
        
        $filePath = Join-Path $path $localPath
        if (Test-Path $filePath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $content.Length
            if ($localPath -match "\.html$") { $response.ContentType = "text/html" }
            elseif ($localPath -match "\.css$") { $response.ContentType = "text/css" }
            elseif ($localPath -match "\.js$") { $response.ContentType = "application/javascript" }
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    } catch {
        # continue
    }
}
