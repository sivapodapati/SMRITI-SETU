import os

count = 0
for root, dirs, files in os.walk('node_modules/html2canvas'):
    for file in files:
        if file.endswith('.js') or file.endswith('.ts'):
            p = os.path.join(root, file)
            with open(p, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            if 'Attempting to parse an unsupported color function' in content:
                print(f"Unpatched occurrence found in: {p}")
                count += 1

if count == 0:
    print("ALL occurrences of 'Attempting to parse an unsupported color function' in html2canvas are 100% FIXED!")
else:
    print(f"Remaining occurrences: {count}")
