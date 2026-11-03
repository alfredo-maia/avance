import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createTenantTemplate } from '../../src/domain/template-seed.ts';

describe('AC-1 & AC-2: Template Seed e Isolamento Multi-Tenant', () => {
  test('cria template de tenant com valores zerados e sem dados pessoais', () => {
    const template = createTenantTemplate('tenant-1', 'Minha Empresa', 'PRO');

    assert.equal(template.tenant.id, 'tenant-1');
    assert.equal(template.tenant.name, 'Minha Empresa');
    assert.equal(template.tenant.plan, 'PRO');
    assert.equal(template.tenant.active, true);

    // Grupos financeiros presentes
    const groups = new Set(template.lines.map((l) => l.group));
    assert.ok(groups.has('RECURSOS_FINANCEIROS'));
    assert.ok(groups.has('RECEITAS'));
    assert.ok(groups.has('INVESTIMENTOS'));
    assert.ok(groups.has('DESPESAS_FIXAS'));
    assert.ok(groups.has('DESPESAS_VARIAVEIS'));

    // Validação de que todos os lançamentos mensais estão estritamente zerados
    for (const line of template.lines) {
      assert.equal(line.tenantId, 'tenant-1');
      assert.ok(line.profile === 'PF' || line.profile === 'PJ');
      for (let m = 1; m <= 12; m++) {
        assert.equal(line.months[m]?.realized, 0, `Line ${line.name} month ${m} realized must be 0`);
        assert.equal(line.months[m]?.target, 0, `Line ${line.name} month ${m} target must be 0`);
        assert.equal(line.months[m]?.settledAt, null);
      }
    }

    // 3 Cartões Padrão presentes
    assert.equal(template.cards.length, 3);
    const cardNames = template.cards.map((c) => c.name);
    assert.ok(cardNames.includes('Banco do Brasil'));
    assert.ok(cardNames.includes('Nubank PF'));
    assert.ok(cardNames.includes('Nubank PJ'));

    for (const card of template.cards) {
      assert.equal(card.tenantId, 'tenant-1');
      for (let m = 1; m <= 12; m++) {
        assert.equal(card.informedInvoices[m], null);
      }
    }

    // Linhas de cartões vinculadas
    const bbCard = template.cards.find((c) => c.name === 'Banco do Brasil')!;
    const bbLine = template.lines.find((l) => l.name === 'Cartão Banco do Brasil')!;
    assert.equal(bbLine.linkedCardId, bbCard.id);

    // 14 Categorias de Cartão
    assert.equal(template.cardCategories.length, 14);
    assert.ok(template.cardCategories.includes('Supermercado'));
    assert.ok(template.cardCategories.includes('Empresa (PJ)'));

    // 4 Categorias de Metas
    assert.deepEqual(template.goalCategories, [
      'FINANCEIRA',
      'DESENVOLVIMENTO_PESSOAL',
      'FISICA_SAUDE',
      'DIVERSAO',
    ]);
  });
});
