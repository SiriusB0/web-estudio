// Prueba con el ejemplo del usuario
const fs = require('fs');

// Simular el contenido del parser (ya que Node.js no puede importar TypeScript directamente)
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

console.log('=== TEXTO DE ENTRADA ===');
console.log(testText);
console.log('\n=== ANÁLISIS DE FORMATO ===');

// Analizar línea por línea
const lines = testText.split('\n');
lines.forEach((line, index) => {
    console.log(`Línea ${index + 1}: "${line}" (longitud: ${line.length})`);
});

console.log('\n=== VERIFICACIÓN DE SALTOS DE LÍNEA ===');
console.log('Número total de líneas:', lines.length);
console.log('Líneas vacías:', lines.filter(line => line.trim() === '').length);
console.log('Líneas con código:', lines.filter(line => 
    line.trim().length > 0 && 
    !line.match(/^Pregunta\s+\d+:/i) && 
    !line.match(/^[a-z]\)/i) && 
    !line.match(/^Respuesta:/i)
).length);
