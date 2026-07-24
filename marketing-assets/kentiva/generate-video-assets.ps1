param(
    [string]$Python = 'C:\Users\AKTASSAK\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
)

$ErrorActionPreference = 'Stop'
$out = $PSScriptRoot

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]

function Await-WinRt($Operation, [Type]$ResultType) {
    $method = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1
    })[0]
    $task = $method.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    $task.Wait()
    return $task.Result
}

function Write-TurkishVoice([string]$Text, [string]$Path) {
    $synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
    $voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices |
        Where-Object { $_.Language -eq 'tr-TR' } |
        Select-Object -First 1
    if (-not $voice) { throw 'Türkçe Windows konuşma sesi bulunamadı.' }
    $synth.Voice = $voice
    $stream = Await-WinRt ($synth.SynthesizeTextToStreamAsync($Text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
    $source = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)
    $target = [System.IO.File]::Create($Path)
    try { $source.CopyTo($target) } finally { $target.Dispose(); $source.Dispose(); $synth.Dispose() }
}

$promoText = @'
Kentiva, belediye hizmetlerini vatandaş, saha ekipleri ve yöneticiler için tek bir güvenli platformda buluşturur. Vatandaşlar konum ve fotoğrafla kolayca bildirim oluşturur. Yapay zekâ destekli önceliklendirme, talebi doğru birime yönlendirir. Saha ekipleri görevlerini anlık takip eder, yapılan işlemi fotoğraf ve sonuç notuyla kapatır. Yöneticiler hizmet performansını, çözüm sürelerini ve vatandaş memnuniyetini canlı göstergelerle izler. Kentiva ile süreçler hızlanır, hizmet kalitesi ölçülür ve vatandaşla güvene dayalı iletişim kurulur. Kentiva. Daha hızlı hizmet, daha güçlü belediye.
'@

$guideText = @'
Kentiva kullanım kılavuzuna hoş geldiniz. Birinci adım: Belediyenizi seçin ve güvenli hesabınızla giriş yapın. İkinci adım: Ana ekrandaki yeni bildirim düğmesine dokunun. Sorunu anlaşılır biçimde yazın, kategori seçin ve gerekli fotoğrafları ekleyin. Üçüncü adım: Konumunuzu kontrol edin. Doğru konum, belediye ekibinin olaya daha hızlı ulaşmasını sağlar. Dördüncü adım: Bildirimi gönderin ve oluşan takip numarasını saklayın. Beşinci adım: Bildirimlerim alanından talebinizin bekliyor, işleniyor veya çözüldü durumlarını canlı olarak izleyin. Belediye personeli için: Yönetim panelindeki rapor kuyruğunu öncelik ve SLA bilgisine göre değerlendirin. Talebi ilgili birime veya saha görevlisine atayın. İş tamamlandığında vatandaşa açıklayıcı sonuç notu ve çözüm fotoğrafı ekleyerek kaydı kapatın. Kentiva, bütün süreci şeffaf, ölçülebilir ve kullanıcı dostu hale getirir.
'@

Write-TurkishVoice $promoText (Join-Path $out 'kentiva-tanitim-ses.wav')
Write-TurkishVoice $guideText (Join-Path $out 'kentiva-kullanim-kilavuzu-ses.wav')
& $Python (Join-Path $out 'generate_videos.py')
if ($LASTEXITCODE) { exit $LASTEXITCODE }
