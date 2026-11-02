import { evaluateReadiness } from './readiness.mjs';

const setupCheckbox = document.getElementById('check-setup');
const specCheckbox = document.getElementById('check-spec');
const qaCheckbox = document.getElementById('check-qa');
const statusBadge = document.getElementById('status-badge');
const missingList = document.getElementById('missing-list');

function updateReadiness() {
  const result = evaluateReadiness({
    setup: setupCheckbox.checked,
    spec: specCheckbox.checked,
    qa: qaCheckbox.checked,
  });

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

// Executa a avaliação no carregamento para sincronia de estado inicial
updateReadiness();
