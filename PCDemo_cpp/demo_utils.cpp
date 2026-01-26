// demo_utils.cpp - Utility functions implementation

#include "demo_utils.h"
#include <sstream>
#include <iomanip>
#include <cctype>

// URL encode a string
std::string UrlEncode(const std::string& value) {
    std::ostringstream escaped;
    escaped.fill('0');
    escaped << std::hex;

    for (char c : value) {
        if (isalnum(static_cast<unsigned char>(c)) || c == '-' || c == '_' || c == '.' || c == '~') {
            escaped << c;
            continue;
        }

        // Any other characters are percent-encoded
        escaped << std::uppercase;
        escaped << '%' << std::setw(2) << int(static_cast<unsigned char>(c));
        escaped << std::nouppercase;
    }

    return escaped.str();
}

// Unescape JSON string (handle \" -> ")
std::string UnescapeJsonString(const std::string& escaped) {
    std::string result;
    result.reserve(escaped.length());
    
    for (size_t i = 0; i < escaped.length(); ++i) {
        if (escaped[i] == '\\' && i + 1 < escaped.length()) {
            char next = escaped[i + 1];
            if (next == '\"' || next == '\\' || next == '/') {
                result += next;
                ++i; // Skip the escaped character
            } else if (next == 'n') {
                result += '\n';
                ++i;
            } else if (next == 'r') {
                result += '\r';
                ++i;
            } else if (next == 't') {
                result += '\t';
                ++i;
            } else {
                result += escaped[i];
            }
        } else {
            result += escaped[i];
        }
    }
    
    return result;
}

// Extract JSON value by key (simple parser for string values)
std::string ExtractJsonStringValue(const std::string& json, const std::string& key) {
    std::string searchKey = "\"" + key + "\":\"";
    size_t startPos = json.find(searchKey);
    if (startPos == std::string::npos) {
        return "";
    }
    
    startPos += searchKey.length();
    size_t endPos = json.find("\"", startPos);
    if (endPos == std::string::npos) {
        return "";
    }
    
    return json.substr(startPos, endPos - startPos);
}

// Extract integer value from JSON
int ExtractJsonIntValue(const std::string& json, const std::string& key, int defaultValue) {
    std::string searchKey = "\"" + key + "\":";
    size_t pos = json.find(searchKey);
    if (pos == std::string::npos) {
        return defaultValue;
    }
    
    pos += searchKey.length();
    std::string valueStr;
    while (pos < json.length() && (isdigit(json[pos]) || json[pos] == ' ' || json[pos] == '-')) {
        if (isdigit(json[pos]) || json[pos] == '-') {
            valueStr += json[pos];
        }
        pos++;
    }
    
    if (!valueStr.empty()) {
        try {
            return std::stoi(valueStr);
        } catch (...) {
            return defaultValue;
        }
    }
    return defaultValue;
}

// Extract boolean value from JSON
bool ExtractJsonBoolValue(const std::string& json, const std::string& key, bool defaultValue) {
    std::string truePattern = "\"" + key + "\":true";
    if (json.find(truePattern) != std::string::npos) {
        return true;
    }
    std::string falsePattern = "\"" + key + "\":false";
    if (json.find(falsePattern) != std::string::npos) {
        return false;
    }
    return defaultValue;
}

// Escape string for JavaScript embedding
std::string EscapeForJs(const std::string& str) {
    std::string result;
    for (char c : str) {
        if (c == '\'') result += "\\'";
        else if (c == '\\') result += "\\\\";
        else if (c == '\n') result += "\\n";
        else if (c == '\r') result += "\\r";
        else result += c;
    }
    return result;
}

// Escape string for JSON embedding
std::string EscapeForJson(const std::string& str) {
    std::string result;
    for (char c : str) {
        if (c == '"') result += "\\\"";
        else if (c == '\\') result += "\\\\";
        else if (c == '\n') result += "\\n";
        else if (c == '\r') result += "\\r";
        else if (c == '\t') result += "\\t";
        else result += c;
    }
    return result;
}
