# Use Node.js as the base image
FROM node:22-bullseye

# Install Python and system dependencies for OpenCV/TensorFlow
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory to /app
WORKDIR /app/server

# Copy server package files and install Node dependencies
COPY server/package*.json ./
RUN npm install

# Copy Python requirements and install Python dependencies
COPY requirements.txt ../
RUN pip3 install --no-cache-dir -r ../requirements.txt

# Copy the rest of the application code
COPY . /app

# Expose the API port
EXPOSE 3000

# Set Environment Variables default (to be overridden by Render)
ENV NODE_ENV=production
ENV PORT=3000

# Start the server
CMD ["node", "index.js"]
