path = 'node_modules/html2canvas/dist/html2canvas.min.js'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

target = "if(void 0===t)throw new Error('Attempting to parse an unsupported color function \"'+e.name+'\"');"
replacement = "if(void 0===t)return Fe(120,120,120,1);"

if target in text:
    text = text.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print('Successfully patched html2canvas.min.js!')
else:
    print('Target not found in html2canvas.min.js')
