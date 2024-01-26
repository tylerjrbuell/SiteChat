FROM selenium/standalone-chrome:latest
USER root
RUN sudo mkdir /app
WORKDIR /app

RUN sudo apt-get install unzip
RUN curl -fsSL https://bun.sh/install | sudo BUN_INSTALL=/usr bash

# Copy source
COPY package.json ./
COPY bun.lockb ./

# Install dependencies
RUN bun install