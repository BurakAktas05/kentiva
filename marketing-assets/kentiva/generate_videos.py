from __future__ import annotations

import math
import subprocess
import wave
from pathlib import Path
import argparse

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent
W, H, FPS = 1280, 720, 18
NAVY = (5, 20, 42)
BLUE = (11, 79, 156)
SKY = (14, 165, 233)
GOLD = (230, 180, 34)
WHITE = (255, 255, 255)
MUTED = (191, 210, 229)


def font(size: int, bold: bool = False):
    path = Path('C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf')
    return ImageFont.truetype(str(path), size)


def audio_duration(path: Path) -> float:
    with wave.open(str(path), 'rb') as wav:
        return wav.getnframes() / wav.getframerate()


def cover(path: Path) -> Image.Image:
    img = Image.open(path).convert('RGB')
    scale = max(W / img.width, H / img.height)
    img = img.resize((math.ceil(img.width * scale), math.ceil(img.height * scale)), Image.Resampling.LANCZOS)
    return img.crop(((img.width - W) // 2, (img.height - H) // 2, (img.width + W) // 2, (img.height + H) // 2))


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt, max_width: int) -> list[str]:
    words, lines, current = text.split(), [], ''
    for word in words:
        trial = f'{current} {word}'.strip()
        if draw.textbbox((0, 0), trial, font=fnt)[2] <= max_width:
            current = trial
        else:
            if current: lines.append(current)
            current = word
    if current: lines.append(current)
    return lines


def logo(draw: ImageDraw.ImageDraw):
    draw.rounded_rectangle((54, 45, 112, 103), radius=17, fill=SKY)
    draw.text((71, 53), 'K', font=font(32, True), fill=WHITE)
    draw.text((130, 48), 'Kentiva', font=font(30, True), fill=WHITE)
    draw.text((131, 82), 'AKILLI BELEDİYE PLATFORMU', font=font(11, True), fill=MUTED)


def render_scene(background: Image.Image, title: str, body: str, kicker: str, progress: float, bright=False) -> Image.Image:
    bg = ImageEnhance.Brightness(background).enhance(0.52 if not bright else 0.72).filter(ImageFilter.GaussianBlur(0.35))
    frame = bg.convert('RGBA')
    overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle((0, 0, W, H), fill=(*NAVY, 95 if not bright else 55))
    od.rectangle((0, 0, 760, H), fill=(*NAVY, 205))
    frame.alpha_composite(overlay)
    draw = ImageDraw.Draw(frame)
    logo(draw)
    draw.rounded_rectangle((58, 163, 58 + min(360, 24 + len(kicker) * 9), 197), radius=17, fill=(*BLUE, 235))
    draw.text((76, 171), kicker.upper(), font=font(12, True), fill=(190, 229, 255))
    y = 230
    for line in wrap(draw, title, font(48, True), 620):
        draw.text((58, y), line, font=font(48, True), fill=WHITE)
        y += 57
    y += 18
    for line in wrap(draw, body, font(22), 590):
        draw.text((60, y), line, font=font(22), fill=MUTED)
        y += 34
    draw.rounded_rectangle((58, H - 57, W - 58, H - 47), radius=5, fill=(75, 97, 124))
    draw.rounded_rectangle((58, H - 57, 58 + int((W - 116) * progress), H - 47), radius=5, fill=GOLD)
    return frame.convert('RGB')


def make_video(name: str, audio_name: str, background_name: str, scenes: list[tuple[str, str, str]]):
    audio = ROOT / audio_name
    duration = audio_duration(audio) + 0.3
    scene_duration = duration / len(scenes)
    total_frames = math.ceil(duration * FPS)
    background = cover(ROOT / background_name)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    silent = ROOT / f'.{name}-silent.mp4'
    proc = subprocess.Popen([
        ffmpeg, '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
        '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', str(silent)
    ], stdin=subprocess.PIPE)
    assert proc.stdin is not None
    for idx in range(total_frames):
        t = idx / FPS
        scene_idx = min(len(scenes) - 1, int(t / scene_duration))
        title, body, kicker = scenes[scene_idx]
        frame = render_scene(background, title, body, kicker, idx / max(1, total_frames - 1), bright=scene_idx % 2 == 1)
        proc.stdin.write(frame.tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise RuntimeError('Video görüntüsü oluşturulamadı')
    output = ROOT / f'{name}.mp4'
    subprocess.run([
        ffmpeg, '-loglevel', 'error', '-y', '-i', str(silent), '-i', str(audio), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
        '-shortest', '-movflags', '+faststart', str(output)
    ], check=True)
    silent.unlink(missing_ok=True)
    print(f'created {output.name} ({duration:.1f}s)')


PROMO_SCENES = [
        ('Belediye hizmetleri tek merkezde', 'Vatandaş, saha ekipleri ve yöneticiler aynı güvenli operasyon akışında.', 'Kentiva'),
        ('Bildirimden çözüme uçtan uca takip', 'Konum, fotoğraf, öncelik ve birim yönlendirmesi tek platformda.', 'Akıllı iş akışı'),
        ('Sahada hızlı, yönetimde ölçülebilir', 'Görev atama, çözüm kanıtı, SLA ve canlı performans göstergeleri.', 'Operasyon yönetimi'),
        ('Daha hızlı hizmet. Daha güçlü belediye.', 'Şeffaf süreçler, yüksek vatandaş memnuniyeti ve veriye dayalı kararlar.', 'Kentiva ile dönüşüm'),
]

GUIDE_SCENES = [
        ('1. Belediyenizi seçin', 'Size ait çalışma alanını seçin ve güvenli hesabınızla giriş yapın.', 'Başlangıç'),
        ('2. Yeni bildirim oluşturun', 'Sorunu açıklayın, kategori seçin ve anlaşılır fotoğraflar ekleyin.', 'Vatandaş uygulaması'),
        ('3. Konumu doğrulayın', 'Doğru konum, saha ekibinin olaya daha hızlı ulaşmasını sağlar.', 'Konum bilgisi'),
        ('4. Takip numaranızı saklayın', 'Bildirimi gönderin ve süreci Bildirimlerim ekranından canlı izleyin.', 'Şeffaf takip'),
        ('5. Operasyon kuyruğunu yönetin', 'Personel talepleri öncelik ve SLA bilgisine göre değerlendirir.', 'Belediye paneli'),
        ('6. Birime veya görevliye atayın', 'Talebi doğru departmana yönlendirin ve saha sorumlusunu belirleyin.', 'Görevlendirme'),
        ('7. Çözümü belgeleyin', 'Sonuç notu ve çözüm fotoğrafı ekleyerek kaydı güvenle kapatın.', 'Tamamlama'),
]


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', choices=['promo', 'guide', 'all'], default='all')
    choice = parser.parse_args().only
    if choice in ('promo', 'all'):
        make_video('kentiva-sesli-tanitim', 'kentiva-tanitim-ses.wav', 'kentiva-enterprise-hero-v2.png', PROMO_SCENES)
    if choice in ('guide', 'all'):
        make_video('kentiva-kullanim-kilavuzu', 'kentiva-kullanim-kilavuzu-ses.wav', 'kentiva-service-flow-social-v2.png', GUIDE_SCENES)
