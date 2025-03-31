FROM nvidia/cuda:12.8.1-devel-ubuntu24.04 AS builder

RUN apt update && \
    apt install -y --no-install-recommends \
        git \
        curl \
        build-essential \
        cmake \
        ca-certificates && \
    apt clean && rm -rf /var/lib/apt/lists/*

# CUDA
#RUN wget https://developer.download.nvidia.com/compute/cuda/repos/debian12/x86_64/cuda-keyring_1.1-1_all.deb && \
#dpkg -i cuda-keyring_1.1-1_all.deb
#RUN apt update && apt install -y cuda-toolkit-12-8 && rm -rf /var/lib/apt/lists/*

#ENV PATH=/usr/local/cuda-12.8/bin${PATH:+:${PATH}}
#ENV LD_LIBRARY_PATH=/usr/local/cuda-12.8/lib64${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}

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

FROM builder AS runtime
# Node.js и npm
RUN apt install -y curl npm && \
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
