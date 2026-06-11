# Set security protocols to TLS 1.2 and TLS 1.3
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13

$port = 8000
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

# Load .env environment variables
$envFile = Join-Path (Get-Location) ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line -like "*=*") {
            $parts = $line.Split("=", 2)
            $key = $parts[0].Trim()
            $val = $parts[1].Trim().Trim("'").Trim('"')
            [System.Environment]::SetEnvironmentVariable($key, $val)
        }
    }
}

Write-Host "Server started at http://localhost:$port/"

try {
    while ($listener.IsListening) {
        $response = $null
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $($request.HttpMethod) $($request.Url.LocalPath)"

            # Add CORS Headers to all responses
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, X-Requested-With, Accept")

            # Handle OPTIONS CORS preflight
            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 200
                $response.Close()
                continue
            }

            $url = $request.Url.LocalPath
            
            # --- API Routes ---
            if ($url -eq "/api/config" -and $request.HttpMethod -eq "GET") {
                $apiKey = $env:GEMINI_API_KEY
                $hasKey = ($null -ne $apiKey -and $apiKey.Trim() -ne "")
                
                $response.StatusCode = 200
                $response.ContentType = "application/json"
                $json = @{ hasApiKey = $hasKey } | ConvertTo-Json
                $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
                $response.Close()
                continue
            }
            
            if ($url -eq "/api/chat" -and $request.HttpMethod -eq "POST") {
                $apiKey = $env:GEMINI_API_KEY
                if ($null -eq $apiKey -or $apiKey.Trim() -eq "") {
                    $response.StatusCode = 500
                    $response.ContentType = "application/json"
                    $errJson = @{ error = @{ message = "Gemini API key is not configured on the server. Please add your GEMINI_API_KEY to the .env file." } } | ConvertTo-Json
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                } else {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
                    $requestBody = $reader.ReadToEnd()
                    $reader.Close()

                    $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$apiKey"
                    try {
                        $httpWebRequest = [System.Net.HttpWebRequest]::Create($endpoint)
                        $httpWebRequest.Method = "POST"
                        $httpWebRequest.ContentType = "application/json"
                        
                        $requestBytes = [System.Text.Encoding]::UTF8.GetBytes($requestBody)
                        $httpWebRequest.ContentLength = $requestBytes.Length
                        
                        $reqStream = $httpWebRequest.GetRequestStream()
                        $reqStream.Write($requestBytes, 0, $requestBytes.Length)
                        $reqStream.Close()
                        
                        $httpWebResponse = $httpWebRequest.GetResponse()
                        $respStream = $httpWebResponse.GetResponseStream()
                        $respReader = New-Object System.IO.StreamReader($respStream, [System.Text.Encoding]::UTF8)
                        $responseString = $respReader.ReadToEnd()
                        $respReader.Close()
                        $respStream.Close()
                        
                        $response.StatusCode = [int]$httpWebResponse.StatusCode
                        $response.ContentType = $httpWebResponse.ContentType
                        
                        $buffer = [System.Text.Encoding]::UTF8.GetBytes($responseString)
                        $response.ContentLength64 = $buffer.Length
                        $response.OutputStream.Write($buffer, 0, $buffer.Length)
                        $httpWebResponse.Close()
                    } catch {
                        $ex = $_.Exception
                        while ($ex -and $ex.InnerException -and $ex.GetType().Name -ne "WebException") {
                            $ex = $ex.InnerException
                        }
                        
                        $response.StatusCode = 500
                        $response.ContentType = "application/json"
                        $errMsg = $ex.Message
                        
                        if ($ex -and $ex.GetType().Name -eq "WebException" -and $ex.Response -ne $null) {
                            try {
                                $respStream = $ex.Response.GetResponseStream()
                                $respReader = New-Object System.IO.StreamReader($respStream, [System.Text.Encoding]::UTF8)
                                $errMsg = $respReader.ReadToEnd()
                                $respReader.Close()
                                $respStream.Close()
                                $response.StatusCode = [int]$ex.Response.StatusCode
                                $response.ContentType = $ex.Response.ContentType
                            } catch {}
                            $ex.Response.Close()
                        }
                        
                        Write-Host "[ERROR] api/chat error: $errMsg"
                        if ($response.ContentType -like "*application/json*") {
                            $buffer = [System.Text.Encoding]::UTF8.GetBytes($errMsg)
                        } else {
                            $errJson = @{ error = @{ message = $errMsg } } | ConvertTo-Json
                            $buffer = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                            $response.ContentType = "application/json"
                        }
                        
                        $response.ContentLength64 = $buffer.Length
                        $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    }
                }
                $response.Close()
                continue
            }
            
            if ($url -eq "/api/upload" -and $request.HttpMethod -eq "POST") {
                $apiKey = $env:GEMINI_API_KEY
                if ($null -eq $apiKey -or $apiKey.Trim() -eq "") {
                    $response.StatusCode = 500
                    $response.ContentType = "application/json"
                    $errJson = @{ error = @{ message = "Gemini API key is not configured on the server. Please add your GEMINI_API_KEY to the .env file." } } | ConvertTo-Json
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                } else {
                    $contentType = $request.Headers["Content-Type"]
                    if ($null -eq $contentType) { $contentType = "application/octet-stream" }
                    
                    $uploadUrl = "https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=media&key=$apiKey"
                    
                    try {
                        $httpWebRequest = [System.Net.HttpWebRequest]::Create($uploadUrl)
                        $httpWebRequest.Method = "POST"
                        $httpWebRequest.ContentType = $contentType
                        
                        if ($request.ContentLength64 -gt 0) {
                            $httpWebRequest.ContentLength = $request.ContentLength64
                        }
                        
                        $reqStream = $httpWebRequest.GetRequestStream()
                        $bufferSize = 8192
                        $streamBuffer = New-Object byte[] $bufferSize
                        $bytesRead = 0
                        
                        while (($bytesRead = $request.InputStream.Read($streamBuffer, 0, $bufferSize)) -gt 0) {
                            $reqStream.Write($streamBuffer, 0, $bytesRead)
                        }
                        $reqStream.Close()
                        
                        $httpWebResponse = $httpWebRequest.GetResponse()
                        $respStream = $httpWebResponse.GetResponseStream()
                        $respReader = New-Object System.IO.StreamReader($respStream, [System.Text.Encoding]::UTF8)
                        $responseString = $respReader.ReadToEnd()
                        $respReader.Close()
                        $respStream.Close()
                        
                        $response.StatusCode = [int]$httpWebResponse.StatusCode
                        $response.ContentType = $httpWebResponse.ContentType
                        
                        $buffer = [System.Text.Encoding]::UTF8.GetBytes($responseString)
                        $response.ContentLength64 = $buffer.Length
                        $response.OutputStream.Write($buffer, 0, $buffer.Length)
                        $httpWebResponse.Close()
                    } catch {
                        $ex = $_.Exception
                        while ($ex -and $ex.InnerException -and $ex.GetType().Name -ne "WebException") {
                            $ex = $ex.InnerException
                        }
                        
                        $response.StatusCode = 500
                        $response.ContentType = "application/json"
                        $errMsg = $ex.Message
                        
                        if ($ex -and $ex.GetType().Name -eq "WebException" -and $ex.Response -ne $null) {
                            try {
                                $respStream = $ex.Response.GetResponseStream()
                                $respReader = New-Object System.IO.StreamReader($respStream, [System.Text.Encoding]::UTF8)
                                $errMsg = $respReader.ReadToEnd()
                                $respReader.Close()
                                $respStream.Close()
                                $response.StatusCode = [int]$ex.Response.StatusCode
                                $response.ContentType = $ex.Response.ContentType
                            } catch {}
                            $ex.Response.Close()
                        }
                        
                        Write-Host "[ERROR] api/upload error: $errMsg"
                        if ($response.ContentType -like "*application/json*") {
                            $buffer = [System.Text.Encoding]::UTF8.GetBytes($errMsg)
                        } else {
                            $errJson = @{ error = @{ message = $errMsg } } | ConvertTo-Json
                            $buffer = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                            $response.ContentType = "application/json"
                        }
                        
                        $response.ContentLength64 = $buffer.Length
                        $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    }
                }
                $response.Close()
                continue
            }

            # --- Static File Serving ---
            if ($url -eq "/") { $url = "/index.html" }
            $filePath = Join-Path (Get-Location) $url

            if (Test-Path $filePath -PathType Leaf) {
                $content = [System.IO.File]::ReadAllBytes($filePath)
                $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
                
                $contentType = switch ($extension) {
                    ".html" { "text/html" }
                    ".css"  { "text/css" }
                    ".js"   { "application/javascript" }
                    ".png"  { "image/png" }
                    ".jpg"  { "image/jpeg" }
                    ".jpeg" { "image/jpeg" }
                    ".gif"  { "image/gif" }
                    ".svg"  { "image/svg+xml" }
                    ".json" { "application/json" }
                    ".ico"  { "image/x-icon" }
                    default { "application/octet-stream" }
                }

                $response.ContentType = $contentType
                $response.ContentLength64 = $content.Length
                $response.OutputStream.Write($content, 0, $content.Length)
            } else {
                $response.StatusCode = 404
                $errText = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.ContentLength64 = $errText.Length
                $response.OutputStream.Write($errText, 0, $errText.Length)
            }
            $response.Close()
        } catch {
            Write-Host "[ERROR] $_"
            if ($null -ne $response) {
                try { $response.Close() } catch {}
            }
        }
    }
} finally {
    $listener.Stop()
}
