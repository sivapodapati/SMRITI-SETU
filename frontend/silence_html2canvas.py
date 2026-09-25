import os

def silence():
    base_dir = 'node_modules/html2canvas'
    count = 0
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.js'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    if 'console.warn(' in content:
                        new_content = content.replace('console.warn("Unsupported color: " + value.name); ', '')
                        new_content = new_content.replace('console.warn(`Unsupported color: ${value.name}`); ', '')
                        new_content = new_content.replace('console.warn("Unsupported color: "+e.name),', '')
                        new_content = new_content.replace('console.warn("Unsupported color: "+t.name),', '')
                        new_content = new_content.replace('console.warn("Unsupported color: "+n.name),', '')
                        
                        if new_content != content:
                            with open(filepath, 'w', encoding='utf-8') as f:
                                f.write(new_content)
                            print(f"Silenced warnings in: {filepath}")
                            count += 1
                except Exception as e:
                    print(f"Error silencing {filepath}: {e}")
                    
    print(f"Total files silenced: {count}")

if __name__ == '__main__':
    silence()
