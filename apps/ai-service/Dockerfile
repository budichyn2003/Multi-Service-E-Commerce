FROM python:3.12-slim

# Slow-network resilience: default pip timeout is 15s and retries 5, which made
# downloads from files.pythonhosted.org fail with ReadTimeoutError. These are
# the official pip env-var settings (equivalent to pip --timeout/--retries).
ENV PIP_DEFAULT_TIMEOUT=120 \
    PIP_RETRIES=10 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN useradd --create-home --uid 10001 appuser
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
