# Use Alpine for smallest possible size
FROM python:3.11-alpine

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install TeX Live binaries and only the needed LaTeX/font packages (includes opensans and fontawesome)
RUN apk add --no-cache \
    texlive \
    texmf-dist-latexrecommended \
    texmf-dist-latexextra \
    texmf-dist-fontsrecommended \
    texmf-dist-fontsextra \
    ghostscript \
    gcc \
    musl-dev \
    libffi-dev \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with optimizations
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    rm -rf ~/.cache/pip

# Copy only backend code (frontend will be built separately)
COPY ./backend ./backend

# Create non-root user for security
RUN adduser -D -s /bin/sh app && \
    chown -R app:app /app
USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8000/api/health || exit 1

# Run with default workers for handling multiple users
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"] 