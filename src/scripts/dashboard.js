(function () {
  function renderDocumentCard(doc) {
    var needsReview = doc.needsReview;
    var statusColor = needsReview ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400';
    var statusDot = needsReview ? 'bg-amber-500' : 'bg-emerald-500';
    var statusText = needsReview ? 'Needs review' : 'Completed';
    var scoreColor = doc.overallConfidence >= 90 ? 'text-emerald-400' : doc.overallConfidence >= 70 ? 'text-amber-400' : 'text-red-400';
    return '<a href="/extract/?id=' + doc.id + '" class="flex items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/30 p-5 transition-all hover:border-neutral-700 hover:bg-neutral-900/50">' +
      '<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">' +
        '<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
      '</div>' +
      '<div class="min-w-0 flex-1">' +
        '<p class="truncate font-medium">' + doc.fileName + '</p>' +
        '<p class="text-sm text-neutral-500">' + new Date(doc.processedAt).toLocaleString() + '</p>' +
      '</div>' +
      '<div class="flex items-center gap-4">' +
        '<span class="text-sm font-medium ' + scoreColor + '">' + doc.overallConfidence + '% confidence</span>' +
        '<span class="inline-flex items-center gap-1.5 rounded-full ' + statusColor + ' px-3 py-1 text-xs font-medium">' +
          '<span class="h-1.5 w-1.5 rounded-full ' + statusDot + '"></span> ' + statusText +
        '</span>' +
      '</div>' +
      '<svg class="h-5 w-5 shrink-0 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' +
    '</a>';
  }

  function renderAll(docs) {
    var emptyState = document.getElementById('empty-state');
    var list = document.getElementById('documents-list');
    if (docs.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (list) list.classList.add('hidden');
      return;
    }
    if (emptyState) emptyState.classList.add('hidden');
    if (list) list.classList.remove('hidden');
    list.innerHTML = docs.map(renderDocumentCard).join('');
  }

  function renderDocuments() {
    var user = window.DocDataEntry.currentUser;
    if (user && window.DocDataEntry.loadUserDocs) {
      window.DocDataEntry.loadUserDocs().then(function (result) {
        var dbDocs = (result.data || []).map(function (r) {
          return {
            id: r.id,
            fileName: r.file_name,
            processedAt: r.created_at,
            overallConfidence: r.overall_confidence,
            needsReview: r.needs_review,
            fileSize: r.file_size,
            inputFormat: r.input_format,
            outputFormat: r.output_format,
            fields: r.fields || [],
            lineItems: r.line_items || [],
            rawText: r.raw_text || '',
            status: r.status
          };
        });
        var localDocs = window.DocDataEntry.getLocalDocuments();
        var merged = dbDocs.concat(localDocs.filter(function (ld) { return !dbDocs.some(function (dd) { return dd.id === ld.id; }); }));
        renderAll(merged);
      });
    } else {
      renderAll(window.DocDataEntry.getLocalDocuments());
    }
  }

  function waitAndRender() {
    if (window.DocDataEntry && window.DocDataEntry.getLocalDocuments) {
      if (window.DocDataEntry.currentUser !== undefined) {
        renderDocuments();
      } else {
        window.addEventListener('insforge-ready', renderDocuments);
      }
    } else {
      setTimeout(waitAndRender, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitAndRender);
  } else {
    waitAndRender();
  }
})();
