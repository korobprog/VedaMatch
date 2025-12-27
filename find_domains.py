import requests
import json

api_key = "tKfkTyehGMjbhrkDOZCLvzQNHqmARYjMSBZDgtLnDfYVRNgBywzwOYmxonSclXUW"
base_url = "http://45.150.9.229:3000/api"

headers = {
    "x-api-key": api_key,
    "Content-Type": "application/json"
}

def get_apps():
    response = requests.get(f"{base_url}/application.all", headers=headers)
    if response.status_code == 200:
        return response.json()
    return []

def get_domains(app_id):
    response = requests.get(f"{base_url}/domain.byApplicationId?applicationId={app_id}", headers=headers)
    if response.status_code == 200:
        return response.json()
    return []

apps = get_apps()
print(f"Apps: {json.dumps(apps, indent=2)}")

for app in apps:
    app_id = app.get('applicationId')
    domains = get_domains(app_id)
    print(f"Domains for {app.get('name')}: {json.dumps(domains, indent=2)}")
