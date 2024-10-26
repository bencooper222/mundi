cmake_minimum_required(VERSION 3.10)
project(mundi)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_CXX_FLAGS_DEBUG "-g")
set(CMAKE_CXX_FLAGS_RELEASE "-O3")
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

set(BUILD_SHARED_LIBS OFF)
set(BUILD_TESTS OFF)


# Add Abseil library
set(ABSL_ENABLE_INSTALL ON)
set(ABSL_PROPAGATE_CXX_STD ON)
add_subdirectory(submodules/abseil)

# Set the absl directory
set(absl_DIR "${CMAKE_CURRENT_SOURCE_DIR}/submodules/abseil")


# Find emar path



if(EMSCRIPTEN)
    set(EMSCRIPTEN_ROOT_PATH $ENV{EMSDK}/upstream/emscripten)
    
    # Update PATH handling
    find_program(EMAR_PATH emar 
        PATHS ${EMSCRIPTEN_ROOT_PATH}
        PATH_SUFFIXES bin em
        NO_DEFAULT_PATH
        REQUIRED
    )
    
    find_program(EMRANLIB_PATH emranlib
        PATHS ${EMSCRIPTEN_ROOT_PATH}
        PATH_SUFFIXES bin em
        NO_DEFAULT_PATH
        REQUIRED
    )
    
    # Set the cross-compilation prefix
    set(CROSS_COMPILE_PREFIX ${EMSCRIPTEN_ROOT_PATH}/em)
endif()

include(ExternalProject)

set(OPENSSL_BUILD_DIR ${CMAKE_BINARY_DIR}/openssl)
set(OPENSSL_INSTALL_PREFIX ${CMAKE_BINARY_DIR}/openssl/install)

ExternalProject_Add(openssl_build
    SOURCE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/submodules/openssl
    BINARY_DIR ${OPENSSL_BUILD_DIR}
    CONFIGURE_COMMAND ${CMAKE_CURRENT_SOURCE_DIR}/submodules/openssl/Configure 
        --prefix=${OPENSSL_INSTALL_PREFIX}
        --openssldir=${OPENSSL_INSTALL_PREFIX}
        no-shared
        no-asm
        no-threads
        no-engine
        no-weak-ssl-ciphers
        no-dso
        no-dgram
        no-sock
        linux-generic32
    BUILD_COMMAND make 
      CC=emcc
      CXX=em++
      AR=${EMAR_PATH}
      RANLIB=${EMRANLIB_PATH}
      CROSS_COMPILE=${EMSCRIPTEN_ROOT_PATH}/em
    INSTALL_COMMAND make install_sw
    BUILD_IN_SOURCE 0

)

# Set OpenSSL directories after build
set(OPENSSL_ROOT_DIR ${OPENSSL_INSTALL_PREFIX})
set(OPENSSL_INCLUDE_DIR ${OPENSSL_INSTALL_PREFIX}/include)
set(OPENSSL_CRYPTO_LIBRARY ${OPENSSL_INSTALL_PREFIX}/lib/libcrypto.a)
set(OPENSSL_SSL_LIBRARY ${OPENSSL_INSTALL_PREFIX}/lib/libssl.a)


# Add S2 library
set(BUILD_TESTS OFF CACHE BOOL "Build tests")
add_subdirectory(submodules/s2)


# Your executable
add_executable(s2_library main.cc)
set_target_properties(s2_library PROPERTIES LINK_FLAGS "--bind -s ERROR_ON_UNDEFINED_SYMBOLS=0 -O3")


# Link against S2 and Abseil
target_link_libraries(s2_library 
s2 
absl::base 
absl::strings 
absl::log
${OPENSSL_CRYPTO_LIBRARY}
${OPENSSL_SSL_LIBRARY}
)


# Include directories
target_include_directories(s2_library PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/submodules/s2/src/s2

    ${CMAKE_CURRENT_SOURCE_DIR}/submodules/abseil/absl/base
    ${CMAKE_CURRENT_SOURCE_DIR}/submodules/abseil/absl/strings
    ${CMAKE_CURRENT_SOURCE_DIR}/submodules/abseil/absl/log

    ${OPENSSL_INCLUDE_DIR}
)
