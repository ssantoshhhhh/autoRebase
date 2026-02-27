"""
REVA-AI Face Recognition Microservice
======================================
Runs on port 8001. Accepts an image, detects all faces using InsightFace
buffalo_l model, and returns bounding boxes + 512-dim embeddings.

POST /detect  → { faces: [{ bbox, embedding }], count }
GET  /health  → { status, model_loaded }
"""

import io
import os
import logging

import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException, Header
from fastapi.responses import JSONResponse
import insightface

# ─── Config ───────────────────────────────────────────────────────────────────
AI_SERVICE_SECRET = os.getenv("AI_SERVICE_SECRET", "internal-service-secret")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("face_service")

# ─── App Init ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="REVA-AI Face Recognition Microservice",
    description="InsightFace-powered face detection and embedding extraction",
    version="1.0.0",
)

# ─── Model Init (loads once at startup) ───────────────────────────────────────
log.info("Loading InsightFace buffalo_l model (first run downloads ~500MB)...")
face_app = insightface.app.FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"],   # Change to CUDAExecutionProvider if GPU available
)
face_app.prepare(ctx_id=0, det_size=(640, 640))
log.info("InsightFace model loaded successfully.")

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Health check — confirms service is running and model is loaded."""
    return {"status": "ok", "model_loaded": True, "model": "buffalo_l"}


@app.post("/detect")
async def detect_faces(
    file: UploadFile = File(...),
    x_service_secret: str = Header(None, alias="X-Service-Secret"),
):
    """
    Detect faces in an uploaded image.

    Returns a list of detected faces with:
    - bbox: [x1, y1, x2, y2] (pixel coordinates)
    - embedding: list of 512 floats (face descriptor vector)
    - det_score: detection confidence from InsightFace
    """
    # ── Auth check ────────────────────────────────────────────────────────────
    if x_service_secret != AI_SERVICE_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized: invalid service secret")

    # ── Validate file type ────────────────────────────────────────────────────
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: {', '.join(allowed_types)}",
        )

    # ── Read and decode image ─────────────────────────────────────────────────
    try:
        raw_bytes = await file.read()
        pil_image = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        img_array = np.array(pil_image)
    except Exception as e:
        log.error(f"Failed to decode image: {e}")
        raise HTTPException(status_code=400, detail=f"Could not decode image: {str(e)}")

    log.info(f"[detect] Image received: {file.filename} | {pil_image.size} px | {file.content_type}")

    # ── Run face detection ────────────────────────────────────────────────────
    try:
        faces = face_app.get(img_array)
    except Exception as e:
        log.error(f"InsightFace inference error: {e}")
        raise HTTPException(status_code=500, detail=f"Face detection failed: {str(e)}")

    # ── Format results ────────────────────────────────────────────────────────
    results = []
    for face in faces:
        x1, y1, x2, y2 = face.bbox.astype(int).tolist()
        embedding = face.embedding.tolist()   # 512-dim list of floats
        det_score = float(face.det_score)

        results.append({
            "bbox": {
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
                "width": x2 - x1,
                "height": y2 - y1,
            },
            "embedding": embedding,
            "det_score": det_score,
        })

    log.info(f"[detect] Found {len(results)} face(s) in {file.filename}")

    return JSONResponse(content={"faces": results, "count": len(results)})
