const CANONICAL_KEYS = ['setup', 'spec', 'qa'];

export function evaluateReadiness(checks) {
  if (typeof checks !== 'object' || checks === null || Array.isArray(checks)) {
    throw new TypeError('O argumento checks deve ser um objeto válido não-nulo.');
  }

  for (const key of CANONICAL_KEYS) {
    if (!(key in checks)) {
      throw new TypeError(`A chave obrigatória "${key}" está ausente no objeto checks.`);
    }
    if (typeof checks[key] !== 'boolean') {
      throw new TypeError(`O valor da chave "${key}" deve ser estritamente booleano.`);
    }
  }

  const missing = [];
  for (const key of CANONICAL_KEYS) {
    if (checks[key] === false) {
      missing.push(key);
    }
  }

  return {
    ready: missing.length === 0,
    missing,
  };
}
