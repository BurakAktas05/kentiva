from __future__ import annotations

import io
import math
import struct
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


OUT = Path(__file__).resolve().parent
BACKGROUND = OUT / "campaign-background.png"

PRIMARY = (11, 79, 156)
PRIMARY_DARK = (6, 47, 92)
SECONDARY = (14, 165, 233)
ACCENT = (230, 180, 34)
SLATE = (15, 23, 42)
MUTED = (71, 85, 105)
WHITE = (255, 255, 255)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def lerp(a: int, b: int, t: float) -> int:
    return round(a + (b - a) * t)


def gradient(size: tuple[int, int], start: tuple[int, int, int], end: tuple[int, int, int], horizontal: bool = True) -> Image.Image:
    width, height = size
    img = Image.new("RGBA", size)
    pix = img.load()
    span = max(1, (width if horizontal else height) - 1)
    for y in range(height):
        for x in range(width):
            t = (x if horizontal else y) / span
            pix[x, y] = (
                lerp(start[0], end[0], t),
                lerp(start[1], end[1], t),
                lerp(start[2], end[2], t),
                255,
            )
    return img


def cover(path: Path, size: tuple[int, int]) -> Image.Image:
    src = Image.open(path).convert("RGB")
    target_w, target_h = size
    ratio = max(target_w / src.width, target_h / src.height)
    resized = src.resize((math.ceil(src.width * ratio), math.ceil(src.height * ratio)), Image.Resampling.LANCZOS)
    left = (resized.width - target_w) // 2
    top = (resized.height - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h)).convert("RGBA")


def rounded_gradient(base: Image.Image, box: tuple[int, int, int, int], radius: int, start: tuple[int, int, int], end: tuple[int, int, int]) -> None:
    x1, y1, x2, y2 = box
    fill = gradient((x2 - x1, y2 - y1), start, end, horizontal=False)
    mask = Image.new("L", fill.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, fill.width, fill.height), radius=radius, fill=255)
    base.alpha_composite(fill, (x1, y1), mask)


def draw_logo_mark(draw: ImageDraw.ImageDraw, x: int, y: int, size: int) -> None:
    radius = round(size * 0.22)
    box = (x, y, x + size, y + size)
    shadow = Image.new("RGBA", (size + 28, size + 28), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((14, 14, size + 14, size + 14), radius=radius, fill=(6, 47, 92, 70))
    shadow = shadow.filter(ImageFilter.GaussianBlur(10))
    draw.bitmap((x - 14, y - 6), shadow, fill=None)
    draw.rounded_rectangle(box, radius=radius, fill=PRIMARY)
    draw.rounded_rectangle(box, radius=radius, outline=(255, 255, 255, 80), width=max(2, size // 48))

    inset = round(size * 0.2)
    stroke = max(8, round(size * 0.07))
    px = x + inset
    py = y + round(size * 0.23)
    bottom = y + size - inset
    center = y + size * 0.52
    draw.line((px, py, px, bottom), fill=WHITE, width=stroke)
    draw.line((px + stroke * 0.75, center, x + size - inset, py + stroke * 0.2), fill=WHITE, width=stroke)
    draw.line((px + stroke * 0.8, center + stroke * 0.25, x + size - inset * 0.85, bottom - stroke * 0.15), fill=WHITE, width=stroke)

    draw.arc((x + size * 0.13, y + size * 0.63, x + size * 0.95, y + size * 1.18), 195, 324, fill=(255, 255, 255, 76), width=max(4, size // 30))
    pin_r = round(size * 0.085)
    pin_x = x + round(size * 0.72)
    pin_y = y + round(size * 0.33)
    draw.ellipse((pin_x - pin_r, pin_y - pin_r, pin_x + pin_r, pin_y + pin_r), fill=ACCENT)
    draw.ellipse((pin_x - pin_r // 2, pin_y - pin_r // 2, pin_x + pin_r // 2, pin_y + pin_r // 2), fill=WHITE)


def text_size(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.ImageFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=fnt)
    return box[2] - box[0], box[3] - box[1]


def wrap_text(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.ImageFont, max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        current = ""
        for word in words:
            trial = word if not current else f"{current} {word}"
            if text_size(draw, trial, fnt)[0] <= max_width:
                current = trial
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines


def draw_multiline(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fnt: ImageFont.ImageFont, fill: tuple[int, int, int], max_width: int, line_gap: int) -> int:
    x, y = xy
    for line in wrap_text(draw, text, fnt, max_width):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += text_size(draw, line, fnt)[1] + line_gap
    return y


def save_logo_svg() -> None:
    svg = """<svg width="900" height="240" viewBox="0 0 900 240" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="mark" x1="44" y1="28" x2="172" y2="188" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0EA5E9"/>
      <stop offset="0.52" stop-color="#0B4F9C"/>
      <stop offset="1" stop-color="#062F5C"/>
    </linearGradient>
    <filter id="shadow" x="18" y="18" width="180" height="180" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#062F5C" flood-opacity="0.24"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <rect x="42" y="34" width="148" height="148" rx="34" fill="url(#mark)"/>
    <path d="M75 132.8V76" stroke="white" stroke-width="15" stroke-linecap="round"/>
    <path d="M87 111L149 75" stroke="white" stroke-width="15" stroke-linecap="round"/>
    <path d="M88 114L154 150" stroke="white" stroke-width="15" stroke-linecap="round"/>
    <path d="M67 151C94 170 142 172 166 142" stroke="white" stroke-opacity="0.32" stroke-width="9" stroke-linecap="round"/>
    <circle cx="145" cy="79" r="15" fill="#E6B422"/>
    <circle cx="145" cy="79" r="6" fill="white"/>
  </g>
  <text x="224" y="117" fill="#0F172A" font-family="Segoe UI, Arial, sans-serif" font-size="70" font-weight="800">Kentiva</text>
  <text x="228" y="153" fill="#475569" font-family="Segoe UI, Arial, sans-serif" font-size="24" font-weight="600">Akıllı belediye platformu</text>
</svg>
"""
    (OUT / "kentiva-logo.svg").write_text(svg, encoding="utf-8")
    mark_svg = svg.replace('width="900" height="240" viewBox="0 0 900 240"', 'width="240" height="240" viewBox="0 0 240 240"')
    mark_svg = mark_svg.split('  <text x="224"')[0] + "</svg>\n"
    (OUT / "kentiva-logo-mark.svg").write_text(mark_svg, encoding="utf-8")


def make_logo_png() -> None:
    img = Image.new("RGBA", (1200, 360), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    draw_logo_mark(draw, 76, 58, 244)
    draw.text((370, 106), "Kentiva", font=font(108, True), fill=SLATE)
    draw.text((376, 218), "Akıllı belediye platformu", font=font(34, False), fill=MUTED)
    img.save(OUT / "kentiva-logo.png")

    mark = Image.new("RGBA", (512, 512), (255, 255, 255, 0))
    draw_mark = ImageDraw.Draw(mark)
    draw_logo_mark(draw_mark, 72, 72, 368)
    mark.save(OUT / "kentiva-logo-mark.png")


def make_banner() -> None:
    size = (1920, 1080)
    img = cover(BACKGROUND, size)
    overlay = Image.new("RGBA", size, (255, 255, 255, 0))
    opix = overlay.load()
    for y in range(size[1]):
        for x in range(size[0]):
            left_fade = max(0, min(1, 1 - x / 1180))
            top_fade = max(0, min(1, 1 - y / 1200))
            alpha = round(238 * (left_fade ** 0.65) + 45 * top_fade)
            opix[x, y] = (255, 255, 255, min(255, alpha))
    img.alpha_composite(overlay)

    blue_sweep = Image.new("RGBA", size, (0, 0, 0, 0))
    bd = ImageDraw.Draw(blue_sweep)
    bd.pieslice((-520, 560, 980, 1570), 190, 340, fill=(11, 79, 156, 210))
    bd.pieslice((-420, 640, 840, 1500), 197, 330, fill=(14, 165, 233, 165))
    bd.arc((-500, 520, 1060, 1550), 190, 340, fill=(230, 180, 34, 230), width=8)
    img.alpha_composite(blue_sweep)

    draw = ImageDraw.Draw(img)
    draw_logo_mark(draw, 130, 106, 86)
    draw.text((238, 112), "Kentiva", font=font(54, True), fill=SLATE)
    draw.text((241, 168), "Akıllı belediye platformu", font=font(20), fill=MUTED)

    y = 282
    y = draw_multiline(
        draw,
        (130, y),
        "Belediye bildirimleri tek platformda",
        font(74, True),
        SLATE,
        760,
        14,
    )
    y += 22
    y = draw_multiline(
        draw,
        (134, y),
        "Vatandaş ihbarı, saha ekipleri ve yönetici paneli aynı akışta buluşur.",
        font(34),
        (51, 65, 85),
        720,
        11,
    )

    badge_y = y + 42
    badges = ["KVKK uyumlu", "Web + mobil", "Canlı durum"]
    x = 134
    for label in badges:
        tw, th = text_size(draw, label, font(23, True))
        draw.rounded_rectangle((x, badge_y, x + tw + 58, badge_y + 54), radius=27, fill=(255, 255, 255, 224), outline=(203, 213, 225, 230), width=2)
        draw.ellipse((x + 18, badge_y + 21, x + 30, badge_y + 33), fill=SECONDARY)
        draw.text((x + 42, badge_y + 13), label, font=font(23, True), fill=(51, 65, 85))
        x += tw + 92

    cta_y = badge_y + 100
    draw.rounded_rectangle((134, cta_y, 480, cta_y + 76), radius=25, fill=PRIMARY)
    draw.text((174, cta_y + 21), "Demo talep edin", font=font(27, True), fill=WHITE)
    draw.text((134, cta_y + 106), "kentiva.app", font=font(30, True), fill=PRIMARY_DARK)
    img.convert("RGB").save(OUT / "kentiva-banner-1920x1080.png", quality=95)


def draw_device_scene(base: Image.Image, progress: float) -> None:
    draw = ImageDraw.Draw(base)
    w, h = base.size
    phone_x = round(w * (0.58 + 0.015 * math.sin(progress * math.tau)))
    phone_y = round(h * 0.24)
    phone_w = round(w * 0.28)
    phone_h = round(h * 0.42)
    draw.rounded_rectangle((phone_x, phone_y, phone_x + phone_w, phone_y + phone_h), radius=34, fill=(15, 23, 42), outline=(255, 255, 255, 150), width=3)
    draw.rounded_rectangle((phone_x + 11, phone_y + 16, phone_x + phone_w - 11, phone_y + phone_h - 14), radius=24, fill=(244, 248, 252))
    for i, (px, py, color) in enumerate(
        [
            (0.25, 0.26, SECONDARY),
            (0.62, 0.22, ACCENT),
            (0.72, 0.53, PRIMARY),
            (0.38, 0.68, SECONDARY),
        ]
    ):
        cx = phone_x + 24 + round((phone_w - 48) * px)
        cy = phone_y + 42 + round((phone_h - 98) * py)
        lift = round(5 * math.sin(progress * math.tau + i))
        draw.ellipse((cx - 11, cy - 17 + lift, cx + 11, cy + 5 + lift), fill=color)
        draw.polygon([(cx - 7, cy + 1 + lift), (cx + 7, cy + 1 + lift), (cx, cy + 16 + lift)], fill=color)
        draw.ellipse((cx - 4, cy - 10 + lift, cx + 4, cy - 2 + lift), fill=WHITE)
    draw.rounded_rectangle((phone_x + 32, phone_y + phone_h - 70, phone_x + phone_w - 32, phone_y + phone_h - 30), radius=18, fill=(255, 255, 255), outline=(226, 232, 240), width=1)
    for i in range(4):
        cx = phone_x + 58 + i * 52
        draw.ellipse((cx - 7, phone_y + phone_h - 56, cx + 7, phone_y + phone_h - 42), fill=(148, 163, 184) if i else PRIMARY)

    card_x = round(w * 0.1)
    card_y = round(h * 0.66)
    draw.rounded_rectangle((card_x, card_y, card_x + round(w * 0.8), card_y + 100), radius=28, fill=(255, 255, 255, 226), outline=(203, 213, 225, 210), width=2)
    draw.ellipse((card_x + 32, card_y + 29, card_x + 74, card_y + 71), fill=(14, 165, 233, 35), outline=SECONDARY, width=3)
    draw.line((card_x + 48, card_y + 50, card_x + 58, card_y + 62, card_x + 78, card_y + 37), fill=PRIMARY, width=5, joint="curve")
    draw.text((card_x + 98, card_y + 24), "İhbar alındı", font=font(30, True), fill=SLATE)
    draw.text((card_x + 98, card_y + 62), "Ekip yönlendirmesi başlatıldı", font=font(21), fill=MUTED)


def write_mjpeg_avi(frames: list[Image.Image], path: Path, fps: int, size: tuple[int, int]) -> None:
    width, height = size
    jpeg_frames: list[bytes] = []
    for frame in frames:
        buffer = io.BytesIO()
        frame.convert("RGB").save(buffer, format="JPEG", quality=88, optimize=True)
        jpeg_frames.append(buffer.getvalue())

    max_frame = max(len(frame) for frame in jpeg_frames)
    total_frames = len(jpeg_frames)

    def chunk(fh, chunk_id: bytes, payload: bytes) -> int:
        start = fh.tell()
        fh.write(chunk_id)
        fh.write(struct.pack("<I", len(payload)))
        fh.write(payload)
        if len(payload) % 2:
            fh.write(b"\0")
        return start

    def list_start(fh, list_type: bytes) -> int:
        start = fh.tell()
        fh.write(b"LIST")
        fh.write(b"\0\0\0\0")
        fh.write(list_type)
        return start

    def list_end(fh, start: int) -> None:
        end = fh.tell()
        fh.seek(start + 4)
        fh.write(struct.pack("<I", end - start - 8))
        fh.seek(end)

    with path.open("wb") as fh:
        fh.write(b"RIFF")
        fh.write(b"\0\0\0\0")
        fh.write(b"AVI ")

        hdrl = list_start(fh, b"hdrl")
        avih = struct.pack(
            "<IIIIIIIIII4I",
            round(1_000_000 / fps),
            max_frame * fps,
            0,
            0x10,
            total_frames,
            0,
            1,
            max_frame,
            width,
            height,
            0,
            0,
            0,
            0,
        )
        chunk(fh, b"avih", avih)

        strl = list_start(fh, b"strl")
        strh = struct.pack(
            "<4s4sIHHIIIIIIIIhhhh",
            b"vids",
            b"MJPG",
            0,
            0,
            0,
            0,
            1,
            fps,
            0,
            total_frames,
            max_frame,
            0xFFFFFFFF,
            0,
            0,
            0,
            width,
            height,
        )
        chunk(fh, b"strh", strh)
        strf = struct.pack(
            "<IiiHH4sIiiII",
            40,
            width,
            height,
            1,
            24,
            b"MJPG",
            max_frame,
            0,
            0,
            0,
            0,
        )
        chunk(fh, b"strf", strf)
        list_end(fh, strl)
        list_end(fh, hdrl)

        movi = list_start(fh, b"movi")
        movi_data_start = fh.tell()
        index_entries: list[tuple[int, int]] = []
        for data in jpeg_frames:
            offset = fh.tell() - movi_data_start
            chunk(fh, b"00dc", data)
            index_entries.append((offset, len(data)))
        list_end(fh, movi)

        idx_payload = bytearray()
        for offset, length in index_entries:
            idx_payload.extend(struct.pack("<4sIII", b"00dc", 0x10, offset, length))
        chunk(fh, b"idx1", bytes(idx_payload))

        end = fh.tell()
        fh.seek(4)
        fh.write(struct.pack("<I", end - 8))


def make_video_assets() -> None:
    w, h = 540, 960
    fps = 8
    seconds = 10
    frames: list[Image.Image] = []
    scenes = [
        ("Kentiva", "Belediye ile vatandaş aynı akışta", "Akıllı belediye platformu"),
        ("Vatandaş bildirir", "Konum ve fotoğrafla hızlı kayıt", "Mobil ve web erişim"),
        ("Ekipler görür", "Öncelik, birim ve durum tek panelde", "Operasyonel takip"),
        ("Süreç şeffaf ilerler", "Canlı durum • KVKK uyumlu • Web + mobil", "Demo talep edin"),
    ]
    bg = cover(BACKGROUND, (w, h)).filter(ImageFilter.GaussianBlur(1.2))
    wash = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    wp = wash.load()
    for y in range(h):
        for x in range(w):
            alpha = round(230 * max(0, 1 - x / (w * 0.94)) + 55 * max(0, 1 - y / h))
            wp[x, y] = (255, 255, 255, min(255, alpha))
    total = fps * seconds
    for idx in range(total):
        t = idx / max(1, total - 1)
        scene_idx = min(len(scenes) - 1, int(t * len(scenes)))
        local = (t * len(scenes)) - scene_idx
        ease = 1 - (1 - min(1, local * 1.7)) ** 3
        frame = bg.copy()
        frame.alpha_composite(wash)
        draw = ImageDraw.Draw(frame)

        draw_logo_mark(draw, 48, 48, 78)
        draw.text((142, 54), "Kentiva", font=font(43, True), fill=SLATE)
        draw.text((145, 101), "Akıllı belediye platformu", font=font(17), fill=MUTED)

        draw_device_scene(frame, t)

        title, body, foot = scenes[scene_idx]
        offset = round((1 - ease) * 52)
        alpha = round(255 * min(1, ease * 1.2))
        text_layer = Image.new("RGBA", (w, h), (255, 255, 255, 0))
        td = ImageDraw.Draw(text_layer)
        copy_x = 48 + offset
        title_end = draw_multiline(td, (copy_x, 194), title, font(44, True), (*SLATE, alpha), 250, 8)
        body_end = draw_multiline(td, (copy_x + 2, title_end + 14), body, font(21), (51, 65, 85, alpha), 230, 8)
        pill_y = body_end + 24
        pill_font = font(18, True)
        tw, _ = text_size(td, foot, pill_font)
        td.rounded_rectangle((copy_x + 2, pill_y, copy_x + tw + 42, pill_y + 46), radius=22, fill=(11, 79, 156, round(238 * ease)))
        td.text((copy_x + 22, pill_y + 12), foot, font=pill_font, fill=(255, 255, 255, alpha))
        frame.alpha_composite(text_layer)

        bar_w = round((w - 96) * t)
        draw.rounded_rectangle((48, h - 58, w - 48, h - 48), radius=5, fill=(203, 213, 225, 190))
        draw.rounded_rectangle((48, h - 58, 48 + bar_w, h - 48), radius=5, fill=ACCENT)
        frames.append(frame.convert("P", palette=Image.Palette.ADAPTIVE, colors=128))

    frames[0].save(
        OUT / "kentiva-reklam-video.gif",
        save_all=True,
        append_images=frames[1:],
        duration=round(1000 / fps),
        loop=0,
        optimize=True,
        disposal=2,
    )
    write_mjpeg_avi([frame.convert("RGB") for frame in frames], OUT / "kentiva-reklam-video.avi", fps, (w, h))
    poster = frames[min(fps, len(frames) - 1)].convert("RGB")
    poster.save(OUT / "kentiva-reklam-poster.png", quality=94)

    storyboard_indices = [fps, fps * 3, fps * 5 + 4, fps * 8]
    storyboard_frames = []
    for frame_index in storyboard_indices:
        frame_index = min(frame_index, len(frames) - 1)
        storyboard_frames.append(frames[frame_index].convert("RGB").resize((270, 480), Image.Resampling.LANCZOS))
    storyboard = Image.new("RGB", (540, 960), "white")
    for idx, frame in enumerate(storyboard_frames):
        storyboard.paste(frame, ((idx % 2) * 270, (idx // 2) * 480))
    storyboard.save(OUT / "kentiva-reklam-storyboard-preview.jpg", quality=92)


def make_readme() -> None:
    prompt = """# Kentiva Pazarlama Görsel Seti

Bu klasörde Kentiva için hazırlanan logo, banner ve reklam animasyonu bulunur.

## Dosyalar

- `kentiva-logo.svg`: Ana vektör logo.
- `kentiva-logo-mark.svg`: Sadece logo işareti.
- `kentiva-logo.png`: Şeffaf zeminli büyük logo.
- `kentiva-logo-mark.png`: Şeffaf zeminli 512x512 logo işareti.
- `kentiva-banner-1920x1080.png`: Web, sunum ve yatay sosyal medya banner görseli.
- `kentiva-reklam-video.avi`: Kısa MJPEG reklam videosu.
- `kentiva-reklam-video.gif`: Kısa animasyonlu reklam çıktısı.
- `kentiva-reklam-poster.png`: Reklam animasyonu kapak görseli.
- `kentiva-reklam-storyboard-preview.jpg`: Reklam animasyonunun dört ana karesi.
- `campaign-background.png`: Üretilen kampanya zemin görseli.
- `generate_assets.py`: Tüm yerel görselleri yeniden üretir.

## Kampanya Metni

Ana mesaj: Belediye bildirimleri tek platformda.

Destek mesajı: Vatandaş ihbarı, saha ekipleri ve yönetici paneli aynı akışta buluşur.

Etiketler: KVKK uyumlu, Web + mobil, Canlı durum.

## Görsel Üretim Promptu

Use case: ads-marketing
Asset type: shared campaign background for Kentiva banner and promo video
Primary request: create a polished civic technology campaign visual for a smart municipality reporting platform.
Scene/backdrop: a modern Turkish city street and municipal operations map blended into a clean digital interface atmosphere, with a smartphone showing anonymous report pins and a subtle municipal building silhouette in the distance.
Subject: citizen-to-municipality service flow, issue reporting, map pins, clean dashboard-like overlays without readable text.
Style/medium: premium semi-realistic 3D editorial illustration, SaaS marketing quality, crisp but trustworthy.
Composition/framing: wide landscape composition, important visual weight on the right half, generous clean negative space on the left for headline overlays.
Lighting/mood: bright morning civic optimism, reliable, calm, professional.
Color palette: Kentiva brand colors: deep municipal blue #0b4f9c, bright sky blue #0ea5e9, small warm gold #e6b422 accents, balanced with white and slate.
Text: none.
Constraints: no readable letters, no logos, no watermarks, no people faces, no license plates, no political symbols, no flags, no distorted UI text.
Avoid: dark moody look, busy clutter, fake brand names, random typography.
"""
    (OUT / "README.md").write_text(prompt, encoding="utf-8")


def main() -> None:
    if not BACKGROUND.exists():
        raise FileNotFoundError(f"Missing background: {BACKGROUND}")
    save_logo_svg()
    make_logo_png()
    make_banner()
    make_video_assets()
    make_readme()
    print(f"Assets written to {OUT}")


if __name__ == "__main__":
    main()
