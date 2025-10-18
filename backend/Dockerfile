FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY ./.env /app/.env

RUN apt-get update && \
    bash -c '\
      set -euo pipefail; \
      apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        gfortran \
        python3-dev; \
      if ! apt-get install -y --no-install-recommends \
        libopenblas-dev \
        liblapack-dev \
        libblis-dev; then \
        echo "⚠️ Optional BLAS/LAPACK packages failed to install; continuing with available providers."; \
      fi \
    ' && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir numpy==1.26.4 && \
    python - <<'PY'
import numpy
print("✅ NumPy configuration summary:")
numpy.__config__.show()
PY

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt || \
    pip install --no-cache-dir --prefer-binary -r requirements.txt

COPY backend/app ./app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
