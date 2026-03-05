FROM python:3.11-slim

WORKDIR /app

# Install required system libraries (for ML tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install PyTorch CPU version FIRST (massive speedup + memory saving)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install the remaining requirements
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Start the Python server on Railway's assigned PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
