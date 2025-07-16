# 1. Use an official Python runtime as a parent image
FROM python:3.11-slim

# 2. Set environment variables to prevent Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Install OS-level dependencies including a minimal TeX Live distribution
# This is carefully curated to support your templates without installing the full 5GB+ TeX Live.
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-extra \
    texlive-pictures \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# 4. Set the working directory in the container
WORKDIR /app

# 5. Copy the requirements file from the project root and install dependencies
# This is done as a separate step to leverage Docker cache.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 6. Copy the backend application code into the container
COPY ./backend /app/backend

# 7. Set the working directory to the backend folder
WORKDIR /app/backend

# 8. Expose the port the app runs on
EXPOSE 8000

# 9. Define the command to run the application
# Use --host 0.0.0.0 to make it accessible from outside the container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 