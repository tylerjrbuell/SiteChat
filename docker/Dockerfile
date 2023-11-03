FROM oven/bun:latest

RUN mkdir /app
WORKDIR /app

# Copy source
COPY package.json ./
COPY bun.lockb ./

# Install dependencies
RUN bun install