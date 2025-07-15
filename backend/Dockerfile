# Step 1: Use an official Python runtime as a parent image
FROM python:3.11-slim

# Step 2: Set the working directory in the container
WORKDIR /app

# Step 3: Install system dependencies including a minimal TeX Live installation
# - apt-get update && apt-get install -y: Updates package lists and installs packages
# - --no-install-recommends: Installs only the main dependencies, not suggested ones (saves space)
# - texlive-latex-base, texlive-fonts-recommended, texlive-latex-extra: Core LaTeX packages
# - latex-xcolor: Provides advanced color options often used in templates
# - ghostscript: Often used by pdflatex for post-processing
# - rm -rf /var/lib/apt/lists/*: Cleans up package lists to keep the final image small
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-extra \
    texlive-xetex \
    texlive-fonts-extra \
    texlive-science \
    texlive-pictures \
    texlive-luatex \
    texlive-lang-all \
    texlive-bibtex-extra \
    texlive-pstricks \
    texlive-publishers \
    texlive-xetex \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-extra \
    texlive-fonts-recommended \
    texlive-latex-base \
    texlive-luatex \
    texlive-xetex \
    texlive-science \
    texlive-pictures \
    texlive-bibtex-extra \
    texlive-pstricks \
    texlive-publishers \
    latex-xcolor \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# Step 4: Copy the requirements file into the container
COPY requirements.txt .

# Step 5: Install any needed packages specified in requirements.txt
# --no-cache-dir: Disables the cache, which reduces the image size
RUN pip install --no-cache-dir -r requirements.txt

# Step 6: Copy the rest of the backend application code into the container
COPY . .

# Step 7: Expose the port the app runs on
# This port will be mapped by Cloud Run automatically
EXPOSE 8000

# Step 8: Define the command to run your app using uvicorn
# This is the command that will be executed when the container starts
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 