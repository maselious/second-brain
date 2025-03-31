FROM nvidia/cuda:12.8.1-devel-ubuntu24.04 AS builder

RUN apt update && \
    apt install -y --no-install-recommends \
        git \
        curl \
        build-essential \
        cmake \
        ca-certificates && \
    apt clean && rm -rf /var/lib/apt/lists/*

ENV MODEL_NAME=base

# Whisper
RUN git clone https://github.com/ggerganov/whisper.cpp.git /whisper.cpp

WORKDIR /whisper.cpp

RUN ./models/download-ggml-model.sh ${MODEL_NAME}

RUN cmake -B build \
    -DGGML_CUDA=ON \
    -DGGML_CPU=ON \
    -DGGML_OPENMP=ON \
    -DGGML_METAL=OFF \
    -DGGML_SYCL=OFF \
    -DGGML_VULKAN=OFF \
    -DGGML_BLAS=OFF \
    -DGGML_ACCELERATE=OFF \
    -DGGML_HIP=OFF \
    -DGGML_RPC=OFF \
    -DGGML_KOMPUTE=OFF \
    -DGGML_LLAMAFILE=OFF \
    -DGGML_CUDA_FA=OFF \
    -DGGML_BUILD_TESTS=OFF \
    -DGGML_BUILD_EXAMPLES=OFF \
    -DCMAKE_CUDA_ARCHITECTURES=89 \
    -DCMAKE_EXE_LINKER_FLAGS="-L/usr/local/cuda/compat -lcuda -Wl,-rpath=/usr/local/cuda/compat"


RUN cmake --build build -j --config Release

FROM nvidia/cuda:12.8.1-runtime-ubuntu24.04 AS runner

# Node.js и npm
RUN  apt update && apt install -y curl npm ffmpeg ca-certificates && \
  npm install -g n && \
  n 22 && \
  apt purge -y nodejs npm && \
  apt clean && rm -rf /var/lib/apt/lists/* && \
  ln -sf /usr/local/bin/node /usr/bin/node && \
  ln -sf /usr/local/bin/npm /usr/bin/npm

# shared libs required by whisper and bins
COPY --from=builder /whisper.cpp/build/bin /usr/local/bin
COPY --from=builder /whisper.cpp/build/src/*.so /usr/local/lib/
COPY --from=builder /whisper.cpp/build/ggml/src/*.so /usr/local/lib/
COPY --from=builder /whisper.cpp/build/ggml/src/ggml-cuda/*.so /usr/local/lib/
COPY --from=builder /whisper.cpp/build/ggml/src/ggml-cpu/*.so /usr/local/lib/

# Прописать переменные окружения
ENV WHISPER_MODEL=base
ENV LD_LIBRARY_PATH="/usr/local/lib:$LD_LIBRARY_PATH"

WORKDIR /app

# Node.js app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 3000
ENTRYPOINT ["node", "dist/index.js"]
