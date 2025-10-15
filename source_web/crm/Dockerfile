# ./prelude-crm/Dockerfile

# --- Stage 1: Builder (Installs dependencies in a virtual environment) ---
FROM python:3.12-slim as builder

# Set the working directory for the builder stage
WORKDIR /app/crm-build

# --- Install build dependencies (like Git and the venv package) ---
RUN apt-get update && \
    apt-get install -y git python3-venv && \
    rm -rf /var/lib/apt/lists/*

# --- Create a virtual environment and install dependencies into it ---
RUN python3 -m venv /opt/venv
COPY requirements.txt .
RUN . /opt/venv/bin/activate && pip install --no-cache-dir -r requirements.txt

# --- Stage 2: Final Runtime (Uses the virtual environment, does NOT include git) ---
FROM python:3.12-slim

# --- Install Tini in the final stage ---
# Install the tini package using apt-get. It's usually placed in /usr/bin/tini
RUN apt-get update && apt-get install -y tini && rm -rf /var/lib/apt/lists/*

# --- Optional: Create and switch to a non-root user ---
RUN adduser --system --no-create-home appuser
USER appuser

# --- Copy ONLY the created virtual environment from the builder stage ---
COPY --from=builder /opt/venv /opt/venv

# Set the final working directory for the application
WORKDIR /app/prelude-crm

# Copy the application source code
COPY . .

# --- Set PATH to include the virtual environment's bin directory ---
ENV PATH="/opt/venv/bin:$PATH"

# --- Use Tini as ENTRYPOINT ---
# Keep this as the exec form. Tini will be PID 1.
ENTRYPOINT ["/usr/bin/tini", "--"]

# CMD to run your application via run.py which handles PORT environment variable
CMD python run.py

# EXPOSE the port
EXPOSE 8080
