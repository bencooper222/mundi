FROM silkeh/clang:18-bookworm as builder

RUN apt-get update && apt-get install -y cmake libssl-dev curl unzip

ARG EMSCRIPTEN_VERSION=3.1.63
RUN curl -Lo emscripten.zip https://github.com/emscripten-core/emsdk/archive/refs/tags/${EMSCRIPTEN_VERSION}.zip && \
    unzip emscripten.zip && \
    mv emsdk-${EMSCRIPTEN_VERSION} emsdk && \
    cd emsdk && \
    ./emsdk install ${EMSCRIPTEN_VERSION} && \
    ./emsdk activate ${EMSCRIPTEN_VERSION} && \
    # sh, not bash :(
    . ./emsdk_env.sh # 

WORKDIR /mundi

COPY submodules/ ./submodules 
COPY .gitmodules ./
COPY CMakeLists.txt main.cc ./

WORKDIR /mundi/build
RUN cmake ..
WORKDIR /mundi

RUN cmake --build build  --target your_program
RUN ./build/your_program