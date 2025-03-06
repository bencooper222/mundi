FROM silkeh/clang:18-bookworm AS builder

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
COPY patches/ ./patches

# TODO: if there's more patches, make this a script that traverses the patches directory.
RUN cd /mundi/submodules/openssl && patch -p1 </mundi/patches/openssl/ranlib.1729879117158.patch


COPY .gitmodules ./
COPY CMakeLists.txt main.cc ./

WORKDIR /mundi/build

RUN cd ../emsdk && . ./emsdk_env.sh && cd ../build && emcmake cmake ..
RUN cd ../emsdk && . ./emsdk_env.sh && cd ../build && emmake make
