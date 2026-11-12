/* =========================================================================
   Caça-Bug — 70-ia.js · 🤖 IA
   O MEU CHAT aqui dentro: as suas chaves (Gemini, Groq, OpenRouter…), o 🦙 Ollama
   sozinho quando estiver ligado (no PC ou no Termux), voz, internet e fotos.
   Os botões 📎 colocam na caixa do chat o DIAGNÓSTICO, o PLANO, um RELATÓRIO
   guardado ou um ARQUIVO do projeto — aí é só perguntar "o que está errado?".
   ========================================================================= */
(function (SK) {
  'use strict';
  let pronto = false, fila = [], box = null;
  const quadro = () => box && box.querySelector('#ia-quadro');
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || !e.data.labChatPronto) return;
    pronto = true; const f = fila; fila = []; f.forEach(mandar);
  });
  function mandar(msg) { const q = quadro(); if (!q || !pronto) { fila.push(msg); return; } q.contentWindow.postMessage({ labMsg: msg }, location.origin); }

  // 🔒 chaves e senhas que aparecerem no texto vão escondidas para a IA
  const esconderChaves = (t) => String(t || '').replace(/\b(AIza[0-9A-Za-z_\-]{20,}|AQ\.[0-9A-Za-z_\-]{20,}|sk-(?:ant-|proj-|or-v1-)?[0-9A-Za-z_\-]{16,}|gsk_[0-9A-Za-z]{20,}|ghp_[0-9A-Za-z]{20,}|github_pat_[0-9A-Za-z_]{20,}|xai-[0-9A-Za-z]{20,}|pplx-[0-9A-Za-z]{20,}|eyJ[0-9A-Za-z_\-]{20,}\.[0-9A-Za-z_\-]{10,}\.[0-9A-Za-z_\-]{10,})/g, (k) => k.slice(0, 4) + '•••(escondida)')
    .replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, '$1•••@');
  /** Coloca o texto na caixa do chat (abre a aba 🤖 IA se precisar). */
  function colar(titulo, texto) {
    if (!box || box.closest('.tela').hidden) SK.app.irPara('ia');
    texto = esconderChaves(texto); const n = texto.length;
    const aviso = n > 60000 ? '\n\n(⚠ texto grande: ' + Math.round(n / 1000) + ' mil letras — o 🦙 Ollama pequeno pode não aguentar tudo; o Gemini aguenta)' : '';
    mandar({ texto: '### ' + titulo + '\n\n' + texto + aviso + '\n\n---\nMinha pergunta: o que está errado e como conserto? (passos simples)', juntar: true });
    SK.toast('📎 ' + titulo + ' foi para a caixa do chat. Agora é só mandar (ou mudar a pergunta).', 'ok');
  }

  const DEC = new TextDecoder('utf-8');
  const BIN = /\.(png|jpe?g|gif|webp|ico|bmp|avif|mp3|wav|ogg|m4a|mp4|webm|mov|pdf|zip|gz|rar|7z|apk|aab|exe|dll|so|woff2?|ttf|otf|eot|wasm|db|sqlite|docx|xlsx|pptx|jar|keystore|jks)$/i;
  function precisaProjeto() { const P = SK.projeto.ativo; if (!P) throw new Error('Escolha um projeto primeiro (aba 📁 Projetos → Usar este).'); return P; }

  async function acao(a) {
    if (a === 'fora') return window.open('ferramentas/meu-chat/index.html', '_blank');
    if (a === 'diag') { const P = precisaProjeto(); const D = await SK.projeto.diagnostico(P.id); return colar('Diagnóstico do projeto "' + P.nome + '"', SK.app.textoDiag(P, D)); }
    if (a === 'plano') {
      const P = precisaProjeto(); SK.toast('⏳ Lendo todos os arquivos…');
      const D = await SK.projeto.diagnostico(P.id); const raiz = D.raiz || '';
      const ent = await SK.projeto.entradasDe(P.id);
      const arqs = ent.map((e) => ({ path: e.name.slice(raiz.length), text: BIN.test(e.name) || e.data.length > 3e6 ? null : DEC.decode(e.data) }));
      return colar('Plano do projeto "' + P.nome + '"', PlanoProjeto.gerar(arqs, P.nome).md);
    }
    if (a === 'rel') {
      const L = await SK.relatorios.listar();
      if (!L.length) throw new Error('Nenhum relatório guardado ainda.');
      return escolher('📎 Qual relatório?', L.map((r) => ({ rotulo: r.ferramenta + ' · ' + r.projetoNome + ' · ' + new Date(r.data).toLocaleString('pt-BR'), fazer: () => colar(r.ferramenta + ' — ' + r.projetoNome, r.texto) })));
    }
    if (a === 'arq') {
      const P = precisaProjeto();
      const ent = (await SK.projeto.entradasDe(P.id)).filter((e) => !BIN.test(e.name) && e.data.length < 1.5e6);
      return escolher('📎 Qual arquivo?', ent.map((e) => ({ rotulo: e.name + ' (' + SK.bytes(e.data.length) + ')', fazer: () => colar('Arquivo ' + e.name + ' (projeto "' + P.nome + '")', '```\n' + DEC.decode(e.data) + '\n```') })), true);
    }
  }
  function escolher(titulo, itens, comBusca) {
    const w = document.createElement('div'); w.className = 'modal-wrap';
    w.innerHTML = '<div class="modal ia-escolha"><h3>' + SK.esc(titulo) + '</h3>' + (comBusca ? '<input class="inp" placeholder="Procurar…">' : '') + '<div class="ia-lista"></div><div class="row end"><button class="btn" data-x="no">Fechar</button></div></div>';
    document.body.appendChild(w);
    const lista = w.querySelector('.ia-lista'), busca = w.querySelector('input');
    const pintar = () => { const q = busca ? busca.value.toLowerCase() : ''; lista.innerHTML = itens.map((it, i) => it.rotulo.toLowerCase().includes(q) ? '<button class="btn small ia-item" data-i="' + i + '">' + SK.esc(it.rotulo) + '</button>' : '').join('') || '<p class="muted">Nada.</p>'; };
    if (busca) busca.oninput = pintar; pintar();
    w.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]'); if (b) { w.remove(); itens[+b.dataset.i].fazer(); return; }
      if (e.target === w || e.target.closest('[data-x]')) w.remove();
    });
  }

  function montar(el) {
    box = el; if (el.dataset.montado) return; el.dataset.montado = '1';
    el.innerHTML = '<div class="card ia-barra"><div class="row wrap"><b>🤖 IA</b><span class="grow"></span>' +
      '<button class="btn small" data-ia="diag">📎 Diagnóstico</button><button class="btn small" data-ia="plano">📎 Plano</button><button class="btn small" data-ia="rel">📎 Um relatório</button><button class="btn small" data-ia="arq">📎 Um arquivo</button><button class="btn small" data-ia="fora">↗ Tela própria</button></div>' +
      '<p class="muted small">É o seu <b>Meu Chat</b> aqui dentro: as suas chaves, o 🦙 <b>Ollama</b> (aparece sozinho quando está ligado — no PC ou no Termux), 🎤 voz, 🌐 internet e 📷 fotos. Os 📎 colocam o texto na caixa; toque em ➤ para perguntar.</p></div>' +
      '<iframe id="ia-quadro" class="ia-quadro" title="Meu Chat" src="ferramentas/meu-chat/index.html" allow="microphone; camera; clipboard-read; clipboard-write; autoplay; fullscreen"></iframe>';
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-ia]'); if (b) acao(b.dataset.ia).catch((er) => SK.toast(er.message, 'error')); });
  }
  SK.ia = { montar, colar };
})(window.SK);
