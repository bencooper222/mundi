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


# Add Abseil library
set(ABSL_ENABLE_INSTALL ON)
add_subdirectory(submodules/abseil)

# Set the absl directory
set(absl_DIR "${CMAKE_CURRENT_SOURCE_DIR}/submodules/abseil")


# S2 needs openssl
set(OPENSSL_ROOT_DIR "/usr")
set(OPENSSL_INCLUDE_DIR "${OPENSSL_ROOT_DIR}/include")
set(OPENSSL_CRYPTO_LIBRARY "/usr/lib/x86_64-linux-gnu/libcrypto.so")
set(OPENSSL_SSL_LIBRARY "/usr/lib/x86_64-linux-gnu/libssl.so")

# Find the OpenSSL package
find_package(OpenSSL REQUIRED)

if (OpenSSL_FOUND)
    message(STATUS "Found OpenSSL: ${OPENSSL_VERSION}")
    include_directories(${OPENSSL_INCLUDE_DIR})
else()
    message(FATAL_ERROR "OpenSSL not found!")
endif()


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