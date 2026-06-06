FROM node:20-slim

WORKDIR /app

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

# Pre-create userdata subdirs so the volume mount works cleanly
RUN mkdir -p userdata/json userdata/qr userdata/persona userdata/mem \
    userdata/chathistory userdata/img userdata/whatsapp

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /app/verticesdashboard

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "start"]
