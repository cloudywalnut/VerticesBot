FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Install bot dependencies
COPY Vertices/package*.json ./Vertices/
RUN cd Vertices && npm ci --omit=dev

# Install dashboard dependencies
COPY verticesdashboard/package*.json ./verticesdashboard/
RUN cd verticesdashboard && npm ci

# Copy source code
COPY Vertices/ ./Vertices/
COPY verticesdashboard/ ./verticesdashboard/

# Build dashboard
RUN cd verticesdashboard && npm run build

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app/verticesdashboard

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "start"]
