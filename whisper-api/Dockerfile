FROM ghcr.io/ggerganov/whisper.cpp:main-cuda

# Node.js и npm
RUN apt update && apt install -y curl npm && \
  npm install -g n && \
  n 22 && \
  apt purge -y nodejs npm && \
  ln -sf /usr/local/bin/node /usr/bin/node && \
  ln -sf /usr/local/bin/npm /usr/bin/npm

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

ENV WHISPER_MODEL=small
EXPOSE 3000

ENTRYPOINT ["node", "dist/index.js"]
