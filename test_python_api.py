#!/usr/bin/env python3
"""
Test script for the Python API route
"""
import sys
import os
import json

# Add the API directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src', 'app', 'api', 'analysis'))

try:
    from route import handler
    
    # Test data
    test_request = {
        "videoUrl": "https://example.com/test.mp4",
        "mode": "mood"
    }
    
    print("Testing Python API handler...")
    print(f"Request: {json.dumps(test_request, indent=2)}")
    
    # This will fail because the URL doesn't exist, but we can test the structure
    result, status_code = handler(test_request)
    
    print(f"Status Code: {status_code}")
    print(f"Result: {json.dumps(result, indent=2)}")
    
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure all dependencies are installed:")
    print("pip install mediapipe numpy opencv-python")
except Exception as e:
    print(f"Error: {e}")
