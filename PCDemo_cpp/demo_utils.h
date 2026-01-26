// demo_utils.h - Utility functions for JSON parsing, string escaping, etc.

#ifndef DEMO_UTILS_H
#define DEMO_UTILS_H

#include <string>

// URL encode a string
std::string UrlEncode(const std::string& value);

// Unescape JSON string (handle \" -> ")
std::string UnescapeJsonString(const std::string& escaped);

// Extract JSON value by key (simple parser for string values)
std::string ExtractJsonStringValue(const std::string& json, const std::string& key);

// Extract integer value from JSON
int ExtractJsonIntValue(const std::string& json, const std::string& key, int defaultValue = 0);

// Extract boolean value from JSON
bool ExtractJsonBoolValue(const std::string& json, const std::string& key, bool defaultValue = false);

// Escape string for JavaScript embedding
std::string EscapeForJs(const std::string& str);

// Escape string for JSON embedding
std::string EscapeForJson(const std::string& str);

#endif // DEMO_UTILS_H
