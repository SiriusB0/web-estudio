// Prueba robusta del parser con el ejemplo del usuario
const testText = `Pregunta 19: ¿Qué salida produce este fragmento de código?

int x = 0;
for(int i=0; i<3; i++){
    x += i;
}
cout << x;


a) 0
b) 3
c) 6
d) 9
Respuesta: c`;

console.log('=== TEXTO ORIGINAL ===');
console.log(JSON.stringify(testText, null, 2));

console.log('\n=== ANÁLISIS LÍNEA POR LÍNEA ===');
const lines = testText.split('\n');
lines.forEach((line, index) => {
    console.log(`${index + 1}: "${line}" (espacios al inicio: ${line.length - line.trimStart().length})`);
});

// Simular el procesamiento del parser
console.log('\n=== SIMULACIÓN DEL PARSER ===');

// 1. Encontrar la pregunta
let questionLineIndex = -1;
let questionMatch = null;

for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const match = trimmed.match(/^Pregunta\s+(\d+):\s*(.*)$/i);
    if (match) {
        questionLineIndex = i;
        questionMatch = match;
        console.log(`Pregunta encontrada en línea ${i + 1}: "${match[2]}"`);
        break;
    }
}

// 2. Recopilar líneas de la pregunta
let currentIndex = questionLineIndex + 1;
const questionLines = [];

if (questionMatch[2].trim()) {
    questionLines.push(questionMatch[2].trim());
}

while (currentIndex < lines.length) {
    const line = lines[currentIndex];
    const trimmed = line.trim();
    
    if (trimmed.match(/^[a-z]\)/i)) {
        console.log(`Primera opción encontrada en línea ${currentIndex + 1}`);
        break;
    }
    
    if (trimmed.toLowerCase().startsWith('respuesta:')) {
        break;
    }
    
    if (trimmed.length > 0 || questionLines.length > 0) {
        questionLines.push(line);
        console.log(`Agregando línea ${currentIndex + 1}: "${line}"`);
    }
    
    currentIndex++;
}

console.log('\n=== RESULTADO FINAL ===');
const finalQuestion = questionLines.join('\n').trim();
console.log('Pregunta completa:');
console.log(JSON.stringify(finalQuestion, null, 2));
