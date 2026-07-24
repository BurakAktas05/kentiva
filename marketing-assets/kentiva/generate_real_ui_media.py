from __future__ import annotations

import math
import subprocess
import wave
import argparse
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent
REAL_UI = ROOT / "real-ui"
W, H, FPS = 1280, 720, 12
NAVY = (4, 18, 39)
BLUE = (11, 79, 156)
SKY = (14, 165, 233)
GOLD = (230, 180, 34)
WHITE = (255, 255, 255)
MUTED = (190, 209, 230)


def font(size: int, bold: bool = False):
    path = Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf")
    return ImageFont.truetype(str(path), size)


def audio_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as wav:
        return wav.getnframes() / wav.getframerate()


def cover(image: Image.Image, width: int, height: int) -> Image.Image:
    scale = max(width / image.width, height / image.height)
    image = image.resize((math.ceil(image.width * scale), math.ceil(image.height * scale)), Image.Resampling.LANCZOS)
    return image.crop(((image.width - width) // 2, (image.height - height) // 2,
                       (image.width + width) // 2, (image.height + height) // 2))


def contain(image: Image.Image, width: int, height: int) -> Image.Image:
    image = image.copy()
    image.thumbnail((width, height), Image.Resampling.LANCZOS)
    return image


_SCREEN_CACHE: dict[str, Image.Image] = {}


def load_screen(name: str) -> Image.Image:
    cached = _SCREEN_CACHE.get(name)
    if cached is not None:
        return cached.copy()
    image = Image.open(REAL_UI / name).convert("RGB")
    if name.startswith("citizen-"):
        phone_width = min(452, image.width)
        left = max(0, (image.width - phone_width) // 2)
        image = image.crop((left, 0, left + phone_width, image.height))
    _SCREEN_CACHE[name] = image.copy()
    return image


def rounded_image(image: Image.Image, width: int, height: int, radius: int = 24, crop: bool = False) -> Image.Image:
    image = cover(image, width, height) if crop else contain(image, width, height)
    canvas = Image.new("RGBA", (width, height), (9, 24, 46, 255))
    x = (width - image.width) // 2
    y = (height - image.height) // 2
    canvas.paste(image.convert("RGBA"), (x, y))
    mask = Image.new("L", (width, height), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, width, height), radius=radius, fill=255)
    canvas.putalpha(mask)
    return canvas


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt, max_width: int) -> list[str]:
    words, lines, current = text.split(), [], ""
    for word in words:
        trial = f"{current} {word}".strip()
        if draw.textbbox((0, 0), trial, font=fnt)[2] <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_brand(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0):
    size = int(54 * scale)
    draw.rounded_rectangle((x, y, x + size, y + size), radius=int(16 * scale), fill=SKY)
    draw.text((x + int(16 * scale), y + int(5 * scale)), "K", font=font(int(31 * scale), True), fill=WHITE)
    draw.text((x + size + int(16 * scale), y + int(1 * scale)), "Kentiva", font=font(int(29 * scale), True), fill=WHITE)
    draw.text((x + size + int(17 * scale), y + int(34 * scale)), "BELEDİYE OPERASYON PLATFORMU", font=font(int(10 * scale), True), fill=MUTED)


def render_scene(screen_name: str, title: str, body: str, kicker: str, progress: float, local_progress: float) -> Image.Image:
    screen = load_screen(screen_name)
    backdrop = cover(screen, W, H).filter(ImageFilter.GaussianBlur(12))
    backdrop = ImageEnhance.Brightness(backdrop).enhance(0.34).convert("RGBA")
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle((0, 0, W, H), fill=(*NAVY, 120))
    od.rectangle((0, 0, 700, H), fill=(*NAVY, 228))
    backdrop.alpha_composite(overlay)
    draw = ImageDraw.Draw(backdrop)
    draw_brand(draw, 52, 42)

    draw.rounded_rectangle((54, 154, 54 + min(390, 28 + len(kicker) * 9), 190), radius=18, fill=(*BLUE, 245))
    draw.text((72, 163), kicker.upper(), font=font(12, True), fill=(194, 230, 255))
    y = 224
    for line in wrap(draw, title, font(45, True), 570):
        draw.text((54, y), line, font=font(45, True), fill=WHITE)
        y += 54
    y += 16
    for line in wrap(draw, body, font(21), 550):
        draw.text((56, y), line, font=font(21), fill=MUTED)
        y += 32

    card_w, card_h = (510, 536) if screen_name.startswith("citizen-") else (620, 430)
    card_x = 722 if screen_name.startswith("citizen-") else 635
    card_y = 118 if screen_name.startswith("citizen-") else 156
    zoom = 1 + 0.012 * math.sin(local_progress * math.pi)
    zw, zh = int(card_w * zoom), int(card_h * zoom)
    panel = rounded_image(screen, zw, zh, radius=28)
    shadow = Image.new("RGBA", (zw + 40, zh + 40), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((20, 20, zw + 20, zh + 20), radius=32, fill=(0, 0, 0, 125))
    shadow = shadow.filter(ImageFilter.GaussianBlur(15))
    backdrop.alpha_composite(shadow, (card_x - 20, card_y - 10))
    backdrop.alpha_composite(panel, (card_x, card_y))

    draw = ImageDraw.Draw(backdrop)
    draw.rounded_rectangle((54, H - 59, W - 54, H - 49), radius=5, fill=(69, 93, 121))
    draw.rounded_rectangle((54, H - 59, 54 + int((W - 108) * progress), H - 49), radius=5, fill=GOLD)
    draw.text((W - 226, 91), "GERÇEK ÜRÜN EKRANI", font=font(10, True), fill=(170, 205, 232))
    return backdrop.convert("RGB")


def make_video(name: str, audio_name: str, scenes: list[tuple[str, str, str, str]]):
    audio = ROOT / audio_name
    duration = audio_duration(audio) + 0.25
    scene_duration = duration / len(scenes)
    total_frames = math.ceil(duration * FPS)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    silent = ROOT / f".{name}-silent.mp4"
    silent.unlink(missing_ok=True)
    proc = subprocess.Popen([
        ffmpeg, "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
        "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", str(silent)
    ], stdin=subprocess.PIPE)
    assert proc.stdin is not None
    for index in range(total_frames):
        timestamp = index / FPS
        scene_index = min(len(scenes) - 1, int(timestamp / scene_duration))
        local = (timestamp - scene_index * scene_duration) / scene_duration
        screen, title, body, kicker = scenes[scene_index]
        frame = render_scene(screen, title, body, kicker, index / max(1, total_frames - 1), local)
        proc.stdin.write(frame.tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise RuntimeError("Video görüntüsü oluşturulamadı")
    output = ROOT / f"{name}.mp4"
    subprocess.run([
        ffmpeg, "-loglevel", "error", "-y", "-i", str(silent), "-i", str(audio),
        "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", str(output)
    ], check=True)
    silent.unlink(missing_ok=True)
    print(f"created {output.name} ({duration:.1f}s)")


def make_banners():
    canvas = Image.new("RGB", (1920, 1080), NAVY)
    bg = cover(load_screen("admin-report-detail.png"), 1920, 1080).filter(ImageFilter.GaussianBlur(18))
    canvas = ImageEnhance.Brightness(bg).enhance(0.28).convert("RGBA")
    veil = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    vd = ImageDraw.Draw(veil)
    vd.rectangle((0, 0, 1150, 1080), fill=(*NAVY, 232))
    vd.rectangle((0, 0, 1920, 1080), fill=(*NAVY, 70))
    canvas.alpha_composite(veil)
    draw = ImageDraw.Draw(canvas)
    draw_brand(draw, 92, 82, 1.25)
    draw.rounded_rectangle((94, 270, 365, 316), radius=23, fill=BLUE)
    draw.text((117, 282), "GERÇEK ÜRÜN DENEYİMİ", font=font(15, True), fill=(205, 235, 255))
    y = 360
    for line in wrap(draw, "Belediye bildirimleri tek platformda.", font(67, True), 800):
        draw.text((92, y), line, font=font(67, True), fill=WHITE)
        y += 80
    y += 22
    for line in wrap(draw, "Vatandaş ihbarı, saha operasyonu ve yönetici görünürlüğü aynı güvenli akışta buluşur.", font(27), 760):
        draw.text((96, y), line, font=font(27), fill=MUTED)
        y += 42
    for index, label in enumerate(("Tenant izolasyonu", "Rol bazlı erişim", "Canlı durum takibi")):
        x = 94 + index * 250
        draw.rounded_rectangle((x, 870, x + 225, 925), radius=18, fill=(10, 43, 78, 255), outline=(65, 139, 205, 255), width=2)
        draw.ellipse((x + 17, 888, x + 29, 900), fill=SKY)
        draw.text((x + 40, 884), label, font=font(16, True), fill=WHITE)

    admin = rounded_image(load_screen("admin-report-detail.png"), 910, 520, 30)
    mobile = rounded_image(load_screen("citizen-home.png"), 275, 530, 38)
    shadow = Image.new("RGBA", (1100, 700), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((40, 70, 1040, 650), radius=50, fill=(0, 0, 0, 145))
    shadow = shadow.filter(ImageFilter.GaussianBlur(25))
    canvas.alpha_composite(shadow, (825, 178))
    canvas.alpha_composite(admin, (900, 270))
    canvas.alpha_composite(mobile, (1580, 388))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((1422, 238, 1795, 292), radius=27, fill=(255, 255, 255, 238))
    draw.text((1450, 252), "YÖNETİCİ + VATANDAŞ", font=font(16, True), fill=BLUE)
    banner_path = ROOT / "kentiva-real-ui-banner-v3.png"
    canvas.convert("RGB").save(banner_path, quality=95)

    square = Image.new("RGBA", (1080, 1080), NAVY + (255,))
    sd = ImageDraw.Draw(square)
    sd.ellipse((760, -190, 1190, 240), fill=(14, 165, 233, 42))
    draw_brand(sd, 66, 55, 1.05)
    sd.text((66, 175), "Gerçek ekranlarla", font=font(28, True), fill=(161, 217, 250))
    sd.text((66, 216), "uçtan uca belediye deneyimi", font=font(50, True), fill=WHITE)
    sd.text((68, 286), "Bildirimden çözüme kadar her adım görünür.", font=font(22), fill=MUTED)
    admin_sq = rounded_image(load_screen("admin-report-detail.png"), 780, 438, 28)
    mobile_sq = rounded_image(load_screen("citizen-report-detail.png"), 250, 520, 36)
    square.alpha_composite(admin_sq, (62, 405))
    square.alpha_composite(mobile_sq, (770, 500))
    sd = ImageDraw.Draw(square)
    sd.rounded_rectangle((64, 900, 748, 989), radius=28, fill=(11, 79, 156, 235))
    sd.text((92, 921), "Vatandaş bildirir  →  Belediye yönetir  →  Süreç izlenir", font=font(21, True), fill=WHITE)
    square_path = ROOT / "kentiva-real-ui-social-v3.png"
    square.convert("RGB").save(square_path, quality=95)
    print(f"created {banner_path.name} and {square_path.name}")


PROMO_SCENES = [
    ("public-home.png", "Belediye hizmetleri tek merkezde", "Kurumsal web, vatandaş uygulaması ve yönetim paneli aynı ürün diliyle çalışır.", "Kentiva"),
    ("citizen-home.png", "Vatandaş için hızlı ve anlaşılır", "Konum, fotoğraf ve açıklama ile bildirim birkaç adımda belediyeye ulaşır.", "Vatandaş deneyimi"),
    ("admin-report-detail.png", "Operasyon için eksiksiz görünürlük", "Takip numarası, öncelik, ekip ve yaşam döngüsü tek profesyonel ekranda.", "Yönetim paneli"),
    ("platform-dashboard.png", "Platform sahibi için ayrı kontrol merkezi", "Belediyeler, abonelikler ve tenant operasyonları güvenli bir merkezden yönetilir.", "Platform yönetimi"),
]

GUIDE_SCENES = [
    ("citizen-home.png", "1. Belediyenizi seçin", "Kurumunuza bağlı vatandaş çalışma alanını açın.", "Başlangıç"),
    ("citizen-home.png", "2. Yeni ihbar oluşturun", "Ana ekrandaki hızlı görev alanını veya artı düğmesini kullanın.", "Vatandaş uygulaması"),
    ("citizen-report-location.png", "3. Konumu doğrulayın", "GPS konumunu kontrol edin veya harita üzerinden noktayı düzeltin.", "Konum adımı"),
    ("citizen-report-detail.png", "4. Süreci takip edin", "Takip numarası ve işlem aşamaları vatandaş ekranında görünür kalır.", "Şeffaf takip"),
    ("admin-report-detail.png", "5. Talebi değerlendirin", "Belediye personeli kategori, öncelik ve kayıt ayrıntılarını tek ekranda inceler.", "Operasyon kuyruğu"),
    ("admin-report-detail.png", "6. Doğru ekibe yönlendirin", "Birim ve saha görevlisi atamasıyla sorumluluk netleştirilir.", "Görevlendirme"),
    ("platform-dashboard.png", "7. Performansı ölçün", "Platform ve belediye yöneticileri süreci ölçülebilir göstergelerle izler.", "Kurumsal yönetim"),
]


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", choices=["banners", "promo", "guide", "all"], default="all")
    choice = parser.parse_args().only
    if choice in ("banners", "all"):
        make_banners()
    if choice in ("promo", "all"):
        make_video("kentiva-real-ui-sesli-tanitim-v3", "kentiva-tanitim-ses.wav", PROMO_SCENES)
    if choice in ("guide", "all"):
        make_video("kentiva-real-ui-kullanim-v3", "kentiva-kullanim-kilavuzu-ses.wav", GUIDE_SCENES)
