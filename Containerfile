FROM silkeh/clang:18-bookworm as builder

WORKDIR /mundi

RUN apt-get update && apt-get install -y cmake curl unzip

ARG EMSCRIPTEN_VERSION=3.1.63
RUN curl -Lo emscripten.zip https://github.com/emscripten-core/emsdk/archive/refs/tags/${EMSCRIPTEN_VERSION}.zip && \
    unzip emscripten.zip && \
    mv emsdk-${EMSCRIPTEN_VERSION} emsdk && \
    cd emsdk && \
    ./emsdk install ${EMSCRIPTEN_VERSION} && \
    ./emsdk activate ${EMSCRIPTEN_VERSION}

COPY submodules/ ./submodules 
COPY .gitmodules ./
COPY CMakeLists.txt main.cc dummy.cc ./

WORKDIR /mundi/build

RUN  cd ../emsdk && . ./emsdk_env.sh && cd ../build && emcmake cmake ..
# WORKDIR /mundi

# RUN cmake --build build  --target your_program
# RUN ./build/your_program