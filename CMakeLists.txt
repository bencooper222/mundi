cmake_minimum_required(VERSION 3.10)
project(mundi)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

set(CMAKE_CXX_FLAGS_DEBUG "-g")
set(CMAKE_CXX_FLAGS_RELEASE "-O3")

# Add Abseil library
set(ABSL_ENABLE_INSTALL ON)
add_subdirectory(submodules/abseil)

# Set the absl directory
set(absl_DIR "${CMAKE_CURRENT_SOURCE_DIR}/submodules/abseil")

# Add S2 library
set(BUILD_TESTS OFF)  # This prevents S2 from building its own tests
add_subdirectory(submodules/s2)


# Your executable
add_executable(your_program main.cc)


# Link against S2 and Abseil
target_link_libraries(your_program s2 absl::base)

# Include directories
target_include_directories(your_program PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/submodules/s2/src
    ${CMAKE_CURRENT_SOURCE_DIR}/submodules/abseil
)