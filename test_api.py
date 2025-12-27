import requests
import json

api_key = "tKfkTyehGMjbhrkDOZCLvzQNHqmARYjMSBZDgtLnDfYVRNgBywzwOYmxonSclXUW"
base_url = "http://45.150.9.229:3000/api"

headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}

try:
    # Try getting projects first to see if API works
    response = requests.get(f"{base_url}/project.all", headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Projects: {response.text}")
    
    # Try getting applications
    response = requests.get(f"{base_url}/application.all", headers=headers)
    print(f"Applications Status: {response.status_code}")
    print(f"Applications: {response.text}")
    
except Exception as e:
    print(f"Error: {e}")
