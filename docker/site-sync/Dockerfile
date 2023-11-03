FROM selenium/standalone-chrome:latest
USER root
RUN sudo mkdir /app
WORKDIR /app
COPY package.json ./
COPY bun.lockb ./

RUN sudo apt-get install unzip
RUN curl -fsSL https://bun.sh/install | sudo BUN_INSTALL=/usr bash


RUN bun install