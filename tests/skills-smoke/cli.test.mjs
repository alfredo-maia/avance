import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const CLI_PATH = new URL('./cli.mjs', import.meta.url).pathname;

test('AC-4: Execução da CLI em sucesso retorna código 0 e JSON na stdout', async () => {
  const inputJson = JSON.stringify({ setup: true, spec: true, qa: true });
  const { stdout, stderr } = await execFileAsync(process.execPath, [CLI_PATH, inputJson]);

  assert.strictEqual(stderr, '');
  const parsed = JSON.parse(stdout);
  assert.deepStrictEqual(parsed, { ready: true, missing: [] });
});

test('AC-5: Execução da CLI em falha encerra com código 2 e escreve motivo na stderr', async () => {
  const failureScenarios = [
    { args: [], expectedErrorMsg: 'Erro: Argumento JSON ausente' },
    { args: ['{ malformed json'], expectedErrorMsg: 'Erro de sintaxe JSON' },
    { args: ['{"setup": true}'], expectedErrorMsg: 'Erro de validação' },
    { args: ['null'], expectedErrorMsg: 'Erro de validação' },
    { args: ['{"setup":"true","spec":true,"qa":true}'], expectedErrorMsg: 'Erro de validação' },
  ];

  for (const scenario of failureScenarios) {
    try {
      await execFileAsync(process.execPath, [CLI_PATH, ...scenario.args]);
      assert.fail(`Deveria ter falhado com código 2 para args: ${JSON.stringify(scenario.args)}`);
    } catch (err) {
      assert.strictEqual(err.code, 2);
      assert.match(err.stderr, new RegExp(scenario.expectedErrorMsg));
      assert.strictEqual(err.stdout, '');
    }
  }
});
