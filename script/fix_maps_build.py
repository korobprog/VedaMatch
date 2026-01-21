import os
import subprocess
import glob

print("Starting fix process...")

frontend_dir = os.path.join(os.getcwd(), 'frontend')
maps_dir = os.path.join(frontend_dir, 'node_modules', 'react-native-maps')

# 1. Install dependencies
print("-- Attempting offline install --")
res = subprocess.run(['pnpm', 'install', '--offline'], cwd=frontend_dir, shell=True)

if res.returncode != 0:
    print("-- Offline failed. Attempting online install (might fail if network is bad) --")
    # Just try, don't break if fails, we check files later
    subprocess.run(['pnpm', 'install'], cwd=frontend_dir, shell=True)

# 2. Patch files
target_dir = os.path.join(maps_dir, 'android/src/main/java/com/facebook/react/viewmanagers')

if not os.path.exists(target_dir):
    print(f"Error: Target directory NOT found: {target_dir}")
    print("Cannot patch. Install likely failed.")
    exit(1)

java_files = glob.glob(os.path.join(target_dir, "*.java"))
print(f"Checking {len(java_files)} Java files for patching...")

patched_count = 0
for file_path in java_files:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        if "ViewManagerWithGeneratedInterface" in content:
            # Remove import
            content = content.replace("import com.facebook.react.uimanager.ViewManagerWithGeneratedInterface;", "")
            
            # Remove extends/implements
            # Case: "extends ViewManagerWithGeneratedInterface"
            content = content.replace(" extends ViewManagerWithGeneratedInterface", "")
            
            # Case: "implements ViewManagerWithGeneratedInterface" (possible variant)
            content = content.replace(" implements ViewManagerWithGeneratedInterface", "")

            if content != original_content:
                print(f"Patching: {os.path.basename(file_path)}")
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                patched_count += 1
    except Exception as e:
        print(f"Failed to patch {file_path}: {e}")

print(f"Done. Patched {patched_count} files.")
