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
add_subdirectory(submodules/abseil)

# Set the absl directory
set(absl_DIR "${CMAKE_CURRENT_SOURCE_DIR}/submodules/abseil")



include(ExternalProject)

set(OPENSSL_BUILD_DIR ${CMAKE_BINARY_DIR}/openssl)
set(OPENSSL_INSTALL_PREFIX ${CMAKE_BINARY_DIR}/openssl/install)

ExternalProject_Add(openssl_build
    SOURCE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/submodules/openssl
    BINARY_DIR ${OPENSSL_BUILD_DIR}
    CONFIGURE_COMMAND emconfigure ${CMAKE_CURRENT_SOURCE_DIR}/submodules/openssl/Configure 
        --prefix=${OPENSSL_INSTALL_PREFIX}
        --openssldir=${OPENSSL_INSTALL_PREFIX}
        no-shared
        no-asm
        no-threads
        no-engine
        no-hw
        no-weak-ssl-ciphers
        linux-generic32
    BUILD_COMMAND emmake make -j4
    INSTALL_COMMAND emmake make install_sw
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
add_executable(your_program main.cc)
add_executable(dummy dummy.cc)


# Link against S2 and Abseil
target_link_libraries(your_program s2 absl::base)

# Include directories
target_include_directories(your_program PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/submodules/s2/src
    ${CMAKE_CURRENT_SOURCE_DIR}/submodules/abseil
    ${OPENSSL_INCLUDE_DIR}
)