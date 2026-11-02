import { evaluateReadiness } from './readiness.mjs';

const setupCheckbox = document.getElementById('check-setup');
const specCheckbox = document.getElementById('check-spec');
const qaCheckbox = document.getElementById('check-qa');
const clearButton = document.getElementById('btn-clear');
const statusBadge = document.getElementById('status-badge');
const statusCount = document.getElementById('status-count');
const missingList = document.getElementById('missing-list');

function updateReadiness() {
  const result = evaluateReadiness({
    setup: setupCheckbox.checked,
    spec: specCheckbox.checked,
    qa: qaCheckbox.checked,
  });

  const total = 3;
  const completed = total - result.missing.length;
  if (statusCount) {
    statusCount.textContent = `${completed} de ${total}`;
  }

  if (result.ready) {
    statusBadge.textContent = 'Pronto';
    statusBadge.className = 'badge badge-ready';
    missingList.innerHTML = '<li class="missing-empty">Nenhuma pendência</li>';
  } else {
    statusBadge.textContent = 'Pendente';
    statusBadge.className = 'badge badge-pending';
    missingList.innerHTML = result.missing.map(key => `<li>${key}</li>`).join('');
  }
}

setupCheckbox.addEventListener('change', updateReadiness);
specCheckbox.addEventListener('change', updateReadiness);
qaCheckbox.addEventListener('change', updateReadiness);

function clearReadiness() {
  setupCheckbox.checked = false;
  specCheckbox.checked = false;
  qaCheckbox.checked = false;
  updateReadiness();
}

clearButton?.addEventListener('click', clearReadiness);

// Executa a avaliação no carregamento para sincronia de estado inicial
updateReadiness();
