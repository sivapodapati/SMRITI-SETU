import os

def patch_file(filepath, target_str, replacement_str):
    if not os.path.exists(filepath):
        print(f"Skipping {filepath} (does not exist)")
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if target_str in content:
        content = content.replace(target_str, replacement_str)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Successfully patched {filepath}")
    else:
        print(f"Target string not found in {filepath} (or already patched)")

def main():
    target = 'throw new Error("Attempting to parse an unsupported color function \\"" + value.name + "\\"");'
    replacement = 'console.warn("Unsupported color: " + value.name); return pack(120, 120, 120, 1);'

    target_esm = 'throw new Error(`Attempting to parse an unsupported color function "${value.name}"`);'
    replacement_esm = 'console.warn(`Unsupported color: ${value.name}`); return pack(120, 120, 120, 1);'

    # minified targets
    target_min1 = 'throw new Error("Attempting to parse an unsupported color function \\""+e.name+"\\"")'
    replacement_min1 = 'return console.warn("Unsupported color: "+e.name),u(120,120,120,1)'

    target_min2 = 'throw new Error("Attempting to parse an unsupported color function \\""+t.name+"\\"")'
    replacement_min2 = 'return console.warn("Unsupported color: "+t.name),o(120,120,120,1)'

    target_min3 = 'throw new Error("Attempting to parse an unsupported color function \\""+n.name+"\\"")'
    replacement_min3 = 'return console.warn("Unsupported color: "+n.name),pack(120,120,120,1)'

    patch_file('node_modules/html2canvas/dist/html2canvas.js', target, replacement)
    patch_file('node_modules/html2canvas/dist/html2canvas.esm.js', target, replacement)
    patch_file('node_modules/html2canvas/dist/html2canvas.esm.js', target_esm, replacement_esm)
    
    # Try minified file replacements
    patch_file('node_modules/html2canvas/dist/html2canvas.min.js', target_min1, replacement_min1)
    patch_file('node_modules/html2canvas/dist/html2canvas.min.js', target_min2, replacement_min2)
    patch_file('node_modules/html2canvas/dist/html2canvas.min.js', target_min3, replacement_min3)

if __name__ == '__main__':
    main()
