FROM python:3.11-slim

WORKDIR /app

# System deps for OpenCV / InsightFace native libs
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# InsightFace model weights will be downloaded to ~/.insightface on first run.
# To pre-download, mount a volume at /root/.insightface.

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
