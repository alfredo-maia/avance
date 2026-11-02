import { evaluateReadiness } from './readiness.mjs';

const rawArg = process.argv[2];

if (!rawArg) {
  process.stderr.write('Erro: Argumento JSON ausente.\n');
  process.exit(2);
}

let checks;
try {
  checks = JSON.parse(rawArg);
} catch (err) {
  process.stderr.write(`Erro de sintaxe JSON: ${err.message}\n`);
  process.exit(2);
}

try {
  const result = evaluateReadiness(checks);
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exit(0);
} catch (err) {
  process.stderr.write(`Erro de validação: ${err.message}\n`);
  process.exit(2);
}
