cmake_minimum_required(VERSION 3.15)
project(webglhost_native_demo VERSION 1.0.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Output directories - simplified structure
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# Set output directories for each configuration (MSVC Multi-config generator)
foreach(CONFIG_TYPE ${CMAKE_CONFIGURATION_TYPES})
    string(TOUPPER ${CONFIG_TYPE} CONFIG_TYPE_UPPER)
    set(CMAKE_RUNTIME_OUTPUT_DIRECTORY_${CONFIG_TYPE_UPPER} ${CMAKE_BINARY_DIR}/bin/${CONFIG_TYPE})
endforeach()

# Source files - organized into modules for better maintainability
set(DEMO_SOURCES
    demo.cpp
    demo_config.cpp
    demo_utils.cpp
    demo_http.cpp
    demo_handlers.cpp
    demo_game.cpp
)

set(DEMO_HEADERS
    demo_config.h
    demo_utils.h
    demo_http.h
    demo_handlers.h
    demo_game.h
)

# Create demo executable
add_executable(demo
    ${DEMO_SOURCES}
    ${DEMO_HEADERS}
)

# Include directories
target_include_directories(demo PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Platform-specific settings
if(WIN32)
    # Windows-specific settings
    
    # Link required Windows libraries
    target_link_libraries(demo PRIVATE
        ws2_32      # Winsock for network communication
        winhttp     # WinHTTP for HTTP requests
    )
    
    # Set Windows subsystem to console
    set_target_properties(demo PROPERTIES
        WIN32_EXECUTABLE FALSE  # Show console window
    )
    
    if(MSVC)
        target_compile_options(demo PRIVATE
            /W3
            /MP
        )
    endif()

elseif(APPLE)
    # macOS-specific settings
    
    # Find and link libcurl (usually available by default on macOS)
    find_package(CURL REQUIRED)
    target_include_directories(demo PRIVATE ${CURL_INCLUDE_DIRS})
    target_link_libraries(demo PRIVATE ${CURL_LIBRARIES})
    
    # Link dl for dynamic library loading (part of system on macOS)
    # No explicit linking needed, dlopen/dlsym are in libSystem
    
    # Compiler options
    target_compile_options(demo PRIVATE
        -Wall
        -Wextra
    )
    
    # Set rpath for finding dylib at runtime
    set_target_properties(demo PROPERTIES
        BUILD_RPATH "@executable_path"
        INSTALL_RPATH "@executable_path"
    )

else()
    # Linux-specific settings
    
    # Find and link libcurl
    find_package(CURL REQUIRED)
    target_include_directories(demo PRIVATE ${CURL_INCLUDE_DIRS})
    target_link_libraries(demo PRIVATE ${CURL_LIBRARIES})
    
    # Link dl for dynamic library loading and pthread
    target_link_libraries(demo PRIVATE
        dl
        pthread
    )
    
    # Compiler options
    target_compile_options(demo PRIVATE
        -Wall
        -Wextra
    )
    
    # Set rpath for finding .so at runtime
    set_target_properties(demo PROPERTIES
        BUILD_RPATH "$ORIGIN"
        INSTALL_RPATH "$ORIGIN"
    )
endif()

# Display configuration information
message(STATUS "========================================")
message(STATUS "WebGLHost Native Demo Configuration")
message(STATUS "========================================")
message(STATUS "Project: ${PROJECT_NAME} v${PROJECT_VERSION}")
message(STATUS "C++ Standard: C++${CMAKE_CXX_STANDARD}")
message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "System: ${CMAKE_SYSTEM_NAME}")
if(WIN32)
    message(STATUS "Platform: Windows")
    message(STATUS "HTTP Library: WinHTTP")
elseif(APPLE)
    message(STATUS "Platform: macOS")
    if(CMAKE_OSX_ARCHITECTURES)
        message(STATUS "Target Architectures: ${CMAKE_OSX_ARCHITECTURES}")
    else()
        message(STATUS "Target Architecture: ${CMAKE_SYSTEM_PROCESSOR}")
    endif()
    message(STATUS "HTTP Library: libcurl")
else()
    message(STATUS "Platform: Linux")
    message(STATUS "HTTP Library: libcurl")
endif()
message(STATUS "Output directory: ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}")
message(STATUS "========================================")
