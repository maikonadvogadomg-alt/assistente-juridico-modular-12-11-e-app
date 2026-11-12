/* =========================================================================
   Assistente Jurídico — 25-regras.js
   📜 O "cérebro" do seu escritório, que cresce com o tempo, SEM mexer no código:
   - Regras: como a IA deve escrever e processar (cole quantas quiser; liga/desliga).
   - Memória: o que a IA deve saber (dados do escritório, preferências, casos).
   - Minhas ações: pedidos que viram BOTÕES no ⚡ Processar.
   Tudo exporta/importa num arquivo (para guardar no Drive ou levar a outro aparelho).
   ========================================================================= */
(function (J) {
  'use strict';
  let painel, cache = [];
  const $ = (s) => J.$(s, painel);
  const TIPOS = {
    regra: { nome: '📜 Regras que a IA sempre segue', dica: 'Ex.: "Sempre pedir justiça gratuita", "Citar a Lei 8.213/91 pelo artigo", "Usar Excelentíssimo por extenso". Pode colar textos grandes.', titulo: 'Nome da regra (ex.: Petição inicial INSS)', texto: 'Cole ou escreva a regra aqui…' },
    memoria: { nome: '🧠 Memória (o que a IA deve saber)', dica: 'Informações que a IA usa em todas as respostas: dados do escritório, como você gosta das coisas, fatos de um caso. Na 💬 Conversa, o botão 🧠 guarda uma resposta aqui.', titulo: 'Assunto (ex.: Dados do escritório)', texto: 'O que a IA deve lembrar…' },
    acao: { nome: '⚡ Minhas ações (viram botões no Processar)', dica: 'Um pedido que você faz sempre vira um botão. Ex.: nome "Réplica INSS", pedido "Faça a réplica à contestação do INSS rebatendo ponto a ponto…".', titulo: 'Nome do botão', texto: 'O pedido completo para a IA…' },
  };


  // 📦 o pacote de regras do Maikon (o que fazia o jurídico antigo sair pronto) — cada uma liga/desliga
  const PACOTE = [
    { tipo: 'regra', titulo: '1. Base: só o que está no processo', texto: 'Trabalhe SOMENTE com o que está no texto e nos documentos que eu enviar. Não invente fatos, datas, números de processo, nomes, valores ou provas. Se faltar alguma informação, escreva [COMPLETAR: o que falta]. Leia o processo inteiro e procure as falhas da outra parte: no INSS, confira requisitos, datas (DER, DIB, DCB), carência, qualidade de segurado, laudos, perícias, contradições entre documentos e decisões.' },
    { tipo: 'regra', titulo: '2. Jurisprudência: só a que eu der', texto: 'Só use julgados, súmulas e temas que estejam no próprio processo ou nas ementas que eu marcar (📚). Escolha no máximo 2, os de maior impacto para este caso, e cite exatamente como vieram, com a fonte. Nunca invente julgado, número, relator ou data. Se um precedente for necessário e não houver, escreva [PESQUISAR: assunto] no lugar.' },
    { tipo: 'regra', titulo: '3. Identificar a peça e o prazo', texto: 'Se eu não disser qual peça quero, descubra pelo momento do processo qual é a peça cabível e diga na primeira linha: "Peça cabível: ___ — prazo: ___ (conferir)". Depois redija a peça.' },
    { tipo: 'regra', titulo: '4. Estrutura obrigatória da peça', texto: 'Toda peça sai pronta para protocolar: endereçamento correto ao juízo ou tribunal, em CAIXA ALTA; referência ao número do processo e às partes; títulos das seções em CAIXA ALTA (DOS FATOS, DO DIREITO, DOS PEDIDOS…); pedidos numerados; fechamento "Nestes termos, pede deferimento."; local, data e assinatura com nome e OAB.' },
    { tipo: 'regra', titulo: '5. Tamanho certo', texto: 'Nem curto demais, nem enrolado: cada argumento uma vez só, parágrafos curtos, sem repetir o resumo do processo dentro da peça. Resumo: no máximo uma página. Peça: o necessário para o pedido, normalmente de 3 a 8 páginas.' },
    { tipo: 'regra', titulo: '6. Português e acabamento', texto: 'Revise ortografia, concordância e pontuação. Sem marcas de IA: nada de "como modelo de linguagem", emojis ou explicações fora da peça. Texto corrido e justificado, pronto para o Word.' },
    { tipo: 'regra', titulo: '7. Conversa livre continua livre', texto: 'Estas regras valem para peças, resumos e análises. Na 💬 Conversa, se eu quiser falar de outro assunto (um desabafo, uma ideia), converse comigo normalmente, sem me obrigar a falar de Direito.' },
  ];
  async function adicionarPacote() {
    const tem = new Set(cache.map((r) => r.titulo)); let n = 0;
    for (const [i, r] of PACOTE.entries()) { if (tem.has(r.titulo)) continue; await J.db.guardar('regras', Object.assign({ ativa: true, criado: Date.now() + i, pacote: true }, r)); n++; }
    J.aviso(n ? '📦 ' + n + ' regra(s) do pacote adicionada(s). Ficam ligadas; desligue as que não quiser.' : '📦 O pacote já está aqui.', 'ok');
  }
  async function carregar() { cache = (await J.db.todos('regras')).sort((a, b) => (a.ordem || a.criado || 0) - (b.ordem || b.criado || 0)); J.emit('regras', cache); }
  function paraIA() {
    const regras = cache.filter((r) => r.tipo === 'regra' && r.ativa !== false);
    const mem = cache.filter((r) => r.tipo === 'memoria' && r.ativa !== false);
    let s = '';
    if (regras.length) s += 'REGRAS DO ADVOGADO (siga SEMPRE, acima de tudo):\n' + regras.map((r) => '### ' + r.titulo + '\n' + r.texto).join('\n\n');
    if (mem.length) s += (s ? '\n\n' : '') + 'MEMÓRIA (informações que você deve levar em conta):\n' + mem.map((r) => '### ' + r.titulo + '\n' + r.texto).join('\n\n');
    return s;
  }

  function montar(el) {
    painel = el;
    el.innerHTML =
      '<div class="caixa">Aqui o seu assistente aprende com o tempo, sem mexer em código. Tudo que estiver <b>ligado</b> (✅) a IA usa em todas as respostas — no ⚡ Processar, no ✏️ Editor e na 💬 Conversa.</div>' +
      Object.entries(TIPOS).map(([k, t]) =>
        '<div class="cartao"><div class="linha"><h2 class="cresce">' + t.nome + '</h2><button class="bt mini forte" data-novo="' + k + '">＋ Nova</button></div>' +
        '<p class="peq mut">' + t.dica + '</p>' +
        '<div class="cartao" data-form="' + k + '" hidden style="box-shadow:none"><input type="text" data-f="titulo" placeholder="' + J.esc(t.titulo) + '">' +
        '<textarea data-f="texto" style="margin-top:6px;min-height:160px" placeholder="' + J.esc(t.texto) + '"></textarea>' +
        '<div class="linha" style="margin-top:6px"><button class="bt forte" data-salvar="' + k + '">💾 Guardar</button><button class="bt" data-ditar="' + k + '">🎤 Ditar</button><button class="bt" data-cancelar="' + k + '">Cancelar</button></div></div>' +
        '<div class="lista" data-lista="' + k + '"></div></div>').join('') +
      '<div class="cartao"><h2>📦 Pacote pronto: o jeito do jurídico antigo</h2><p class="peq mut">Sete regras do que fazia a peça sair pronta: só o que está no processo, jurisprudência só a que você der (no máximo 2, as de maior impacto), identificar a peça e o prazo, estrutura com endereçamento e fechamento, tamanho certo, português revisado, e a Conversa continuar livre. Cada uma entra separada: dá para editar ou desligar.</p><button class="bt forte" id="rg-pacote">📦 Adicionar o pacote</button></div>' +
      '<div class="cartao"><h2>💾 Guardar e levar</h2><p class="peq mut">Um arquivo com todas as regras, a memória e as suas ações. Guarde no Drive; em outro aparelho, é só importar.</p>' +
      '<div class="linha"><button class="bt" id="rg-exportar">⬇ Exportar</button><button class="bt forte" id="rg-drive">📤 Mandar ao Drive</button><button class="bt" id="rg-importar">📥 Importar</button></div>' +
      '<p class="peq mut" id="rg-tamanho"></p></div>';
    el.addEventListener('click', clique);
    el.addEventListener('change', async (e) => { const c = e.target.closest('[data-ligar]'); if (!c) return; const r = cache.find((x) => x.id === c.dataset.ligar); if (r) { r.ativa = c.checked; await J.db.guardar('regras', r); } });
    Object.keys(TIPOS).forEach((k) => J.voz.botaoDitado(J.$('[data-ditar="' + k + '"]', el), J.$('[data-form="' + k + '"] [data-f="texto"]', el)));
    $('#rg-pacote').onclick = adicionarPacote;
    $('#rg-exportar').onclick = () => J.baixar('regras-e-memoria-' + new Date().toISOString().slice(0, 10) + '.json', exportar(), 'application/json');
    $('#rg-drive').onclick = () => J.compartilhar('regras-e-memoria-' + new Date().toISOString().slice(0, 10) + '.json', exportar(), 'application/json');
    $('#rg-importar').onclick = async () => {
      const [f] = await J.importar.escolher('.json,application/json,.txt,.md'); if (!f) return;
      try {
        let itens;
        if (/\.json$/i.test(f.name)) { const d = JSON.parse(await f.text()); itens = Array.isArray(d) ? d : d.itens || []; }
        else itens = [{ tipo: 'regra', titulo: f.name.replace(/\.\w+$/, ''), texto: await f.text() }]; // um .txt/.md vira uma regra inteira
        let n = 0; for (const it of itens) { if (!it.texto) continue; await J.db.guardar('regras', { tipo: TIPOS[it.tipo] ? it.tipo : 'regra', titulo: it.titulo || 'Sem nome', texto: it.texto, ativa: it.ativa !== false, criado: it.criado || Date.now() }); n++; }
        J.aviso('📥 ' + n + ' item(ns) importado(s).', 'ok');
      } catch (e) { J.aviso('Arquivo inválido: ' + e.message, 'erro'); }
    };
    J.on('db', (d) => { if (d.loja === 'regras') carregar().then(pintar); });
    carregar().then(pintar);
  }
  function exportar() { return JSON.stringify({ app: 'assistente-juridico-regras', versao: 1, criado: new Date().toISOString(), itens: cache.map((r) => ({ tipo: r.tipo, titulo: r.titulo, texto: r.texto, ativa: r.ativa !== false, criado: r.criado })) }, null, 1); }
  function pintar() {
    for (const k of Object.keys(TIPOS)) {
      const lista = cache.filter((r) => r.tipo === k);
      J.$('[data-lista="' + k + '"]', painel).innerHTML = lista.length ? lista.map((r) =>
        '<div class="item"><input type="checkbox" data-ligar="' + r.id + '"' + (r.ativa !== false ? ' checked' : '') + ' title="Ligar/desligar" aria-label="Ligar"><div class="info"><b>' + J.esc(r.titulo) + '</b><small>' + J.esc(r.texto.slice(0, 120)) + (r.texto.length > 120 ? '…' : '') + ' · ' + r.texto.length.toLocaleString('pt-BR') + ' letras</small></div>' +
        '<div class="bts"><button class="bt mini" data-editar="' + r.id + '">✏️</button><button class="bt mini perigo" data-apagar="' + r.id + '">🗑</button></div></div>').join('')
        : '<p class="mut peq">Nada ainda.</p>';
    }
    const tam = paraIA().length;
    const t = $('#rg-tamanho'); if (t) t.textContent = 'Ligado agora: ' + tam.toLocaleString('pt-BR') + ' letras vão junto em cada pedido.' + (tam > 60000 ? ' ⚠ É bastante: a IA do computador (Ollama) pode ficar lenta — desligue o que não usar sempre.' : '');
  }
  async function clique(e) {
    const b = e.target.closest('button'); if (!b) return;
    const k = b.dataset.novo || b.dataset.salvar || b.dataset.cancelar;
    if (b.dataset.novo) { const f = J.$('[data-form="' + k + '"]', painel); f.hidden = false; f.dataset.id = ''; J.$('[data-f="titulo"]', f).value = ''; J.$('[data-f="texto"]', f).value = ''; J.$('[data-f="titulo"]', f).focus(); }
    if (b.dataset.cancelar) J.$('[data-form="' + k + '"]', painel).hidden = true;
    if (b.dataset.salvar) {
      const f = J.$('[data-form="' + k + '"]', painel); const texto = J.$('[data-f="texto"]', f).value.trim();
      if (!texto) return J.aviso('Escreva ou cole o texto.');
      const antigo = f.dataset.id ? cache.find((x) => x.id === f.dataset.id) : null;
      await J.db.guardar('regras', Object.assign(antigo || { criado: Date.now(), ativa: true }, { tipo: k, titulo: J.$('[data-f="titulo"]', f).value.trim() || texto.slice(0, 50), texto }));
      f.hidden = true; J.aviso('💾 Guardado. ' + (k === 'acao' ? 'O botão já aparece no ⚡ Processar.' : 'A IA já vai usar.'), 'ok');
    }
    if (b.dataset.editar) { const r = cache.find((x) => x.id === b.dataset.editar); if (!r) return; const f = J.$('[data-form="' + r.tipo + '"]', painel); f.hidden = false; f.dataset.id = r.id; J.$('[data-f="titulo"]', f).value = r.titulo; J.$('[data-f="texto"]', f).value = r.texto; f.scrollIntoView({ behavior: 'smooth' }); }
    if (b.dataset.apagar) { const r = cache.find((x) => x.id === b.dataset.apagar); if (r && confirm('Apagar "' + r.titulo + '"?')) await J.db.apagar('regras', r.id); }
  }

  J.regras = {
    paraIA,
    acoes: () => cache.filter((r) => r.tipo === 'acao' && r.ativa !== false),
    async lembrar(titulo, texto) { await J.db.guardar('regras', { tipo: 'memoria', titulo, texto, ativa: true, criado: Date.now() }); },
  };
  carregar(); // já deixa pronto para a IA, mesmo antes de abrir a aba
  J.registrar({ aba: 'regras', montar });
})(window.J);
