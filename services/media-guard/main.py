"""
İhbar fotoğrafları için hafif yüz / selfie sezgisi (OpenCV Haar).
Üretimde eşikleri İBB pilot verisiyle kalibre edin.
"""
import os

import cv2
import numpy as np
from fastapi import FastAPI, Request
from pydantic import BaseModel

app = FastAPI(title="BelediyeApp Media Guard", version="1.0.0")

MAX_FACE_COVERAGE = float(os.environ.get("MAX_FACE_COVERAGE", "0.22"))
MAX_IMAGE_BYTES = int(os.environ.get("MAX_IMAGE_BYTES", str(12 * 1024 * 1024)))

_cascade = None


class ScanResult(BaseModel):
    reject: bool
    reason: str = ""
    face_coverage: float = 0.0


def get_cascade():
    global _cascade
    if _cascade is None:
        path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        _cascade = cv2.CascadeClassifier(path)
    return _cascade


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/scan", response_model=ScanResult)
async def scan_raw(request: Request) -> ScanResult:
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_IMAGE_BYTES:
                return ScanResult(reject=True, reason="Görüntü boyutu sınırı aşıldı.", face_coverage=0.0)
        except ValueError:
            return ScanResult(reject=True, reason="Geçersiz içerik uzunluğu.", face_coverage=0.0)

    raw_buffer = bytearray()
    async for chunk in request.stream():
        if len(raw_buffer) + len(chunk) > MAX_IMAGE_BYTES:
            return ScanResult(reject=True, reason="Görüntü boyutu sınırı aşıldı.", face_coverage=0.0)
        raw_buffer.extend(chunk)

    raw = bytes(raw_buffer)
    if not raw or len(raw) < 32:
        return ScanResult(reject=True, reason="Geçersiz veya boş görüntü.", face_coverage=0.0)

    data = np.asarray(bytearray(raw), dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    if img is None:
        return ScanResult(reject=True, reason="Görüntü çözümlenemedi.", face_coverage=0.0)

    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = get_cascade().detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(48, 48))

    if len(faces) == 0:
        return ScanResult(reject=False, reason="Yüz tespit edilmedi.", face_coverage=0.0)

    max_cov = 0.0
    for (_x, _y, fw, fh) in faces:
        cov = (fw * fh) / float(w * h)
        max_cov = max(max_cov, cov)

    if max_cov >= MAX_FACE_COVERAGE:
        return ScanResult(
            reject=True,
            reason="Kadrajda yüz oranı yüksek; sorunu gösteren geniş açılı fotoğraf yükleyin.",
            face_coverage=round(max_cov, 4),
        )

    return ScanResult(reject=False, reason="Kabul edilebilir.", face_coverage=round(max_cov, 4))
