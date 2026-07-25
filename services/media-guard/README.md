# Media Guard

İhbar görsellerinde yüz yoğunluğu kontrolü (FastAPI + OpenCV Haar).

Üretim dağıtımı: [`../../deployment/MEDIA-GUARD.md`](../../deployment/MEDIA-GUARD.md)

## Yerel

```bash
docker compose --env-file .env.docker up media-guard
curl http://localhost:8001/health
```

Veya:

```bash
cd services/media-guard
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
