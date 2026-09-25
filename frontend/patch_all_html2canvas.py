import os
import re

def patch():
    base_dir = 'node_modules/html2canvas'
    if not os.path.exists(base_dir):
        print("html2canvas dir not found")
        return

    pattern = re.compile(r'throw new Error\(\s*[\"\`]Attempting to parse an unsupported color function.*?\);?', re.DOTALL)
    
    count = 0
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.js') or file.endswith('.ts'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    if 'Attempting to parse an unsupported color function' in content:
                        new_content = pattern.sub('return (typeof pack !== "undefined" ? pack(120, 120, 120, 1) : 0);', content)
                        if new_content != content:
                            with open(filepath, 'w', encoding='utf-8') as f:
                                f.write(new_content)
                            print(f"Patched: {filepath}")
                            count += 1
                        else:
                            print(f"Pattern did not match in: {filepath}")
                except Exception as e:
                    print(f"Error patching {filepath}: {e}")
                    
    print(f"Total files patched: {count}")

if __name__ == '__main__':
    patch()
