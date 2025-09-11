// Prueba del parser de flashcards de opción múltiple
const { parseMultipleChoiceText } = require('./src/lib/notes/multipleChoiceParser.ts');

// Caso de prueba 1: Pregunta simple sin código
const test1 = `Pregunta 1: ¿Cuál es la capital de Francia?
a) Madrid
b) París
c) Roma
d) Londres
Respuesta: b`;

// Caso de prueba 2: Pregunta con código multilínea
const test2 = `Pregunta 1: ¿Qué hace este código JavaScript?
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(n => n * 2);
console.log(doubled);
a) Multiplica cada número por 2
b) Suma todos los números
c) Encuentra el número mayor
d) Ordena los números
Respuesta: a

Pregunta 2: ¿Cuál es el resultado de este código Python?
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n-1)
print(factorial(5))
a) 24
b) 120
c) 25
d) 5
Respuesta: b`;

// Caso de prueba 3: Múltiples respuestas correctas con código
const test3 = `Pregunta 1: ¿Cuáles de estos son lenguajes de programación compilados?
a) JavaScript
b) C++
c) Python
d) Java
e) Go
Respuesta: b,d,e

Pregunta 2: ¿Qué líneas de este código tienen errores de sintaxis?
1: function suma(a, b) {
2:     return a + b
3: }
4: console.log(suma(2, 3);
a) Línea 1
b) Línea 2
c) Línea 3
d) Línea 4
Respuesta: b,d`;

function testParser(testCase, testName) {
    console.log(`\n=== ${testName} ===`);
    console.log('Texto de entrada:');
    console.log(testCase);
    console.log('\nResultado del parser:');
    
    try {
        const result = parseMultipleChoiceText(testCase);
        console.log('Preguntas encontradas:', result.questions.length);
        console.log('Errores:', result.errors);
        
        result.questions.forEach((q, index) => {
            console.log(`\nPregunta ${index + 1}:`);
            console.log('  Texto:', q.question);
            console.log('  Opciones:', q.options.map(opt => `${opt.letter}) ${opt.text}`));
            console.log('  Respuestas correctas:', q.correctAnswers);
        });
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Ejecutar pruebas
testParser(test1, 'Pregunta simple');
testParser(test2, 'Preguntas con código multilínea');
testParser(test3, 'Múltiples respuestas con código');
