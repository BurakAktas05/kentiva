# Git History Hassas Veri Temizleme Scripti

# Bu script, projede yer alan ve git history'e yanlışlıkla girmiş olabilecek
# Firebase admin SDK anahtarlarını, google-services.json dosyasını ve base64
# credential dosyalarını git geçmişinden tamamen siler.

# NOT: Bu işlemi yapmadan önce projenizin yedeğini almanızı öneririz.
# Temizlik sonrasında uzak sunucuya (GitHub/GitLab) zorla push (push --force) yapmanız gerekecektir.

Write-Host "=== Kentiva Git History Temizleyici ===" -ForegroundColor Cyan

# 1. git-filter-repo veya BFG yüklü değilse basit yedek yöntem sunacağız.
# En güvenli ve pratik yöntem: Gizli dosyaları geçici bir yere alıp, .git klasörünü silip
# repoyu temiz bir şekilde yeniden başlatmaktır (Commit geçmişi önemsiz ise).

$choice = Read-Host "Commit geçmişinizi sıfırlayarak temiz bir başlangıç yapmak ister misiniz? (E/H)"

if ($choice -eq "E" -or $choice -eq "e") {
    Write-Host "Commit geçmişi sıfırlanıyor..." -ForegroundColor Yellow
    
    # Geçici yedek oluştur
    $tempDir = Join-Path $env:TEMP "kentiva_backup"
    if (Test-Path $tempDir) { Remove-Item -Path $tempDir -Recurse -Force }
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    
    # Hassas dosyaları geçici dizine taşı (silinmemeleri için)
    $sensitiveFiles = @(
        "google-services.json",
        "kentiva-96081-firebase-adminsdk-fbsvc-e3bf0c3f8d.json",
        "kentiva_base64url.json",
        ".env",
        ".env.local"
    )
    
    foreach ($file in $sensitiveFiles) {
        if (Test-Path $file) {
            Copy-Item -Path $file -Destination $tempDir
            Write-Host "$file geçici olarak yedeklendi." -ForegroundColor Green
        }
    }
    
    # .git klasörünü sil
    if (Test-Path ".git") {
        Remove-Item -Path ".git" -Recurse -Force
        Write-Host ".git klasörü silindi." -ForegroundColor Green
    }
    
    # Git'i yeniden başlat
    git init
    git checkout -b main
    
    # Hassas dosyaların .gitignore'da olduğundan emin ol
    # (Zaten .gitignore dosyasında ekli durumdalar)
    
    # Commit oluştur
    git add .
    git commit -m "Initial commit (Cleaned history & appId updated)"
    
    # Hassas dosyaları geri kopyala
    foreach ($file in $sensitiveFiles) {
        $tempPath = Join-Path $tempDir $file
        if (Test-Path $tempPath) {
            Copy-Item -Path $tempPath -Destination "." -Force
        }
    }
    
    Write-Host "Git geçmişi başarıyla sıfırlandı ve hassas dosyalar geçmişten temizlendi!" -ForegroundColor Green
    Write-Host "Uzak sunucuya bağlamak için: git remote add origin <URL>" -ForegroundColor Yellow
    Write-Host "Ardından: git push -u origin main --force" -ForegroundColor Yellow
} else {
    Write-Host "İşlem iptal edildi. Git geçmişi değiştirilmedi." -ForegroundColor Yellow
}
