(function () {
  var params = new URLSearchParams(window.location.search);
  var docId = params.get('id') || window.location.pathname.split('/').pop();
  var loading = document.getElementById('loading');
  var notFound = document.getElementById('not-found');
  var content = document.getElementById('content');

  var rulesState = {
    tax: true,
    total: true,
    invFormat: true,
    dateFormat: true,
  };

  function applyBusinessRules(doc) {
    var subtotalField = doc.fields.find(function (f) { return f.key === 'subtotal' || f.key === 'sub_total'; });
    var taxField = doc.fields.find(function (f) { return f.key === 'tax' || f.key === 'tax_amount'; });
    var totalField = doc.fields.find(function (f) { return f.key === 'total' || f.key === 'grand_total' || f.key === 'amount'; });
    var invNumField = doc.fields.find(function (f) { return f.key === 'invoice_number' || f.key === 'invoice_num' || f.key === 'doc_number'; });
    var dateField = doc.fields.find(function (f) { return f.key === 'date' || f.key === 'invoice_date' || f.key === 'doc_date'; });

    var subtotal = subtotalField ? parseFloat(subtotalField.value.replace(/[^0-9.-]/g, '')) : NaN;
    var tax = taxField ? parseFloat(taxField.value.replace(/[^0-9.-]/g, '')) : NaN;
    var total = totalField ? parseFloat(totalField.value.replace(/[^0-9.-]/g, '')) : NaN;

    doc.fields.forEach(function (f) { f._ruleFlags = []; });

    if (rulesState.tax && taxField && !isNaN(subtotal) && !isNaN(tax)) {
      var expectedTax = Math.round(subtotal * 0.16 * 100) / 100;
      if (Math.abs(tax - expectedTax) > 0.01) {
        taxField._ruleFlags.push('Tax should be ' + expectedTax.toFixed(2) + ' (16% of ' + subtotal.toFixed(2) + ')');
      }
    }

    if (rulesState.total && totalField && !isNaN(subtotal) && !isNaN(tax) && !isNaN(total)) {
      var expectedTotal = Math.round((subtotal + tax) * 100) / 100;
      if (Math.abs(total - expectedTotal) > 0.01) {
        totalField._ruleFlags.push('Total should be ' + expectedTotal.toFixed(2) + ' (= ' + subtotal.toFixed(2) + ' + ' + tax.toFixed(2) + ')');
      }
    }

    if (rulesState.invFormat && invNumField) {
      var val = invNumField.value;
      if (!/^INV[-_]\d{4,}/i.test(val) && !/^\d{4,}$/.test(val)) {
        invNumField._ruleFlags.push('Format should be INV-XXXXX');
      }
    }

    if (rulesState.dateFormat && dateField) {
      var val = dateField.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        dateField._ruleFlags.push('Format should be YYYY-MM-DD');
      }
    }

    updateRuleStatuses(doc);
  }

  function updateRuleStatuses(doc) {
    var subtotalField = doc.fields.find(function (f) { return f.key === 'subtotal' || f.key === 'sub_total'; });
    var taxField = doc.fields.find(function (f) { return f.key === 'tax' || f.key === 'tax_amount'; });
    var totalField = doc.fields.find(function (f) { return f.key === 'total' || f.key === 'grand_total' || f.key === 'amount'; });
    var invNumField = doc.fields.find(function (f) { return f.key === 'invoice_number' || f.key === 'invoice_num' || f.key === 'doc_number'; });
    var dateField = doc.fields.find(function (f) { return f.key === 'date' || f.key === 'invoice_date' || f.key === 'doc_date'; });

    function setStatus(id, pass) {
      var el = document.getElementById(id);
      if (el) {
        el.textContent = pass ? 'Pass' : 'Fail';
        el.className = 'text-xs ' + (pass ? 'text-emerald-400' : 'text-red-400');
      }
    }

    var subtotal = subtotalField ? parseFloat(subtotalField.value.replace(/[^0-9.-]/g, '')) : NaN;
    var tax = taxField ? parseFloat(taxField.value.replace(/[^0-9.-]/g, '')) : NaN;
    var total = totalField ? parseFloat(totalField.value.replace(/[^0-9.-]/g, '')) : NaN;
    var taxPass = !rulesState.tax || !taxField || isNaN(subtotal) || isNaN(tax) || Math.abs(tax - Math.round(subtotal * 0.16 * 100) / 100) <= 0.01;
    setStatus('rule-tax-status', taxPass);

    var totalPass = !rulesState.total || !totalField || isNaN(subtotal) || isNaN(tax) || isNaN(total) || Math.abs(total - Math.round((subtotal + tax) * 100) / 100) <= 0.01;
    setStatus('rule-total-status', totalPass);

    var invPass = !rulesState.invFormat || !invNumField || /^INV[-_]\d{4,}/i.test(invNumField.value) || /^\d{4,}$/.test(invNumField.value);
    setStatus('rule-inv-format-status', invPass);

    var datePass = !rulesState.dateFormat || !dateField || /^\d{4}-\d{2}-\d{2}$/.test(dateField.value);
    setStatus('rule-date-format-status', datePass);
  }

  function renderFilePreview(doc) {
    var container = document.getElementById('pdf-viewer-container');
    var panel = document.getElementById('pdf-viewer-panel');
    if (!container || !panel) return;

    var fileData = null;
    try { fileData = localStorage.getItem('docdataentry_file_' + doc.id); } catch {}

    if (!fileData || fileData === 'null') {
      var isImg = /\.(png|jpe?g|tiff?|webp)$/i.test(doc.fileName);
      if (isImg && doc.fileType && doc.fileType.startsWith('image/')) {
        container.innerHTML = '<p class="text-sm text-neutral-500">Preview available after re-upload.</p>';
        panel.classList.remove('hidden');
      } else {
        container.innerHTML = '<p class="text-sm text-neutral-500">File preview not available for this document.</p>';
      }
      return;
    }

    panel.classList.remove('hidden');

    if (fileData.startsWith('data:image/')) {
      container.innerHTML = '<img src="' + fileData + '" alt="Document preview" class="max-w-full h-auto" />';
    } else if (fileData.startsWith('data:application/pdf')) {
      container.innerHTML = '<embed src="' + fileData + '" type="application/pdf" class="w-full h-full min-h-[400px]" />';
    } else {
      container.innerHTML = '<p class="text-sm text-neutral-500">Preview not available for this file type.</p>';
    }
  }

  function loadDocument() {
    var doc = window.DocDataEntry.getLocalDocuments().find(function (d) { return d.id === docId; });
    if (!doc) {
      if (loading) loading.classList.add('hidden');
      if (notFound) notFound.classList.remove('hidden');
      return;
    }

    if (loading) loading.classList.add('hidden');
    if (content) content.classList.remove('hidden');

    applyBusinessRules(doc);
    renderDocument(doc);
    renderFilePreview(doc);

    // Rules toggle
    var rulesToggle = document.getElementById('rules-toggle');
    var rulesSection = document.getElementById('rules-section');
    var rulesChevron = document.getElementById('rules-chevron');
    if (rulesToggle && rulesSection) {
      rulesToggle.addEventListener('click', function () {
        var isHidden = rulesSection.classList.toggle('hidden');
        if (rulesChevron) rulesChevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
      });
    }

    // Rule checkboxes
    function bindRule(id, key) {
      var el = document.getElementById(id);
      if (el) {
        el.checked = rulesState[key];
        el.addEventListener('change', function () {
          rulesState[key] = el.checked;
          applyBusinessRules(doc);
          renderDocument(doc);
        });
      }
    }
    bindRule('rule-tax', 'tax');
    bindRule('rule-total', 'total');
    bindRule('rule-inv-format', 'invFormat');
    bindRule('rule-date-format', 'dateFormat');

    var deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function () {
        if (confirm('Delete this document permanently?')) {
          window.DocDataEntry.deleteLocalDocument(docId);
          window.DocDataEntry.deleteFileData(docId);
          window.location.href = '/dashboard';
        }
      });
    }

    function downloadCsv(csv, filename) {
      var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    var exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', function () {
        var header = 'Field,Value,Confidence\n';
        var rows = doc.fields.map(function (f) {
          return '"' + f.label + '","' + f.value + '","' + f.confidence + '%"';
        }).join('\n');
        var csv = header + '\nLine Items\nDescription,Qty,Unit Price,Total\n' +
          doc.lineItems.map(function (li) {
            return '"' + li.description + '",' + li.quantity + ',$' + li.unit_price.toFixed(2) + ',$' + li.total.toFixed(2);
          }).join('\n');
        downloadCsv(csv, doc.fileName.replace(/\.[^.]+$/, '') + '_extracted.csv');
      });
    }

    var exportQbBtn = document.getElementById('export-qb-btn');
    if (exportQbBtn) {
      exportQbBtn.addEventListener('click', function () {
        var baseName = doc.fileName.replace(/\.[^.]+$/, '');
        var vendor = doc.fields.find(function (f) { return f.key === 'vendor' || f.key === 'merchant' || f.key === 'supplier'; });
        var vendorName = vendor ? vendor.value : 'Unknown Vendor';
        var invoiceNum = doc.fields.find(function (f) { return f.key === 'invoice_number' || f.key === 'invoice_num' || f.key === 'doc_number'; });
        var invNum = invoiceNum ? invoiceNum.value : baseName;
        var dateField = doc.fields.find(function (f) { return f.key === 'date' || f.key === 'invoice_date' || f.key === 'doc_date'; });
        var invDate = dateField ? dateField.value : new Date().toLocaleDateString('en-US');
        var totalField = doc.fields.find(function (f) { return f.key === 'total' || f.key === 'amount' || f.key === 'grand_total'; });
        var total = totalField ? totalField.value : '0.00';

        var qbRows = [];
        if (doc.lineItems && doc.lineItems.length > 0) {
          doc.lineItems.forEach(function (li) {
            qbRows.push('"INVOICE","' + invDate + '","' + invNum + '","' + vendorName + '","","' + li.description + '",' + li.quantity + ',' + li.unit_price.toFixed(2) + ',' + li.total.toFixed(2));
          });
        } else {
          qbRows.push('"INVOICE","' + invDate + '","' + invNum + '","' + vendorName + '","","Invoice payment",1,' + total + ',' + total);
        }
        var qbCsv = 'Type,Date,Num,Name,Memo,Description,Quantity,Rate,Amount\n' + qbRows.join('\n');
        downloadCsv(qbCsv, baseName + '_quickbooks.csv');
      });
    }

    var exportXeroBtn = document.getElementById('export-xero-btn');
    if (exportXeroBtn) {
      exportXeroBtn.addEventListener('click', function () {
        var baseName = doc.fileName.replace(/\.[^.]+$/, '');
        var vendor = doc.fields.find(function (f) { return f.key === 'vendor' || f.key === 'merchant' || f.key === 'supplier'; });
        var vendorName = vendor ? vendor.value : 'Unknown Vendor';
        var invoiceNum = doc.fields.find(function (f) { return f.key === 'invoice_number' || f.key === 'invoice_num' || f.key === 'doc_number'; });
        var invNum = invoiceNum ? invoiceNum.value : baseName;
        var dateField = doc.fields.find(function (f) { return f.key === 'date' || f.key === 'invoice_date' || f.key === 'doc_date'; });
        var invDate = dateField ? dateField.value : new Date().toLocaleDateString('en-US');
        var totalField = doc.fields.find(function (f) { return f.key === 'total' || f.key === 'amount' || f.key === 'grand_total'; });
        var total = totalField ? totalField.value : '0.00';

        var xeroRows = [];
        if (doc.lineItems && doc.lineItems.length > 0) {
          doc.lineItems.forEach(function (li) {
            xeroRows.push('*,"' + vendorName + '","' + invNum + '","","' + invDate + '",,' + total + ',USD,"' + li.description + '",' + li.quantity + ',' + li.unit_price.toFixed(2) + ',200,Tax on Sales,' + li.total.toFixed(2));
          });
        } else {
          xeroRows.push('*,"' + vendorName + '","' + invNum + '","","' + invDate + '",,' + total + ',USD,"Invoice payment",1,' + total + ',200,Tax on Sales,' + total);
        }
        var xeroCsv = '*,Contact Name,Invoice Number,Reference,Invoice Date,Due Date,Total,Currency,Description,Quantity,Unit Amount,Account Code,Tax Type,Amount\n' + xeroRows.join('\n');
        downloadCsv(xeroCsv, baseName + '_xero.csv');
      });
    }

    var approveBtn = document.getElementById('approve-btn');
    if (approveBtn) {
      approveBtn.addEventListener('click', function () {
        doc.status = 'completed';
        doc.needsReview = false;
        doc.fields = doc.fields.map(function (f) {
          return { key: f.key, label: f.label, value: f.value, confidence: Math.min(100, f.confidence + 5) };
        });
        window.DocDataEntry.saveLocalDocument(doc);
        applyBusinessRules(doc);
        renderDocument(doc);
      });
    }
  }

  function renderDocument(doc) {
    var titleEl = document.getElementById('doc-title');
    var metaEl = document.getElementById('doc-meta');
    if (titleEl) titleEl.textContent = doc.fileName;
    if (metaEl) {
      var formatMap = { pdf: 'PDF', image: 'Image', word: 'Word' };
      var outputMap = { xlsx: 'Excel (XLSX)', csv: 'CSV', json: 'JSON', xml: 'XML' };
      var inFmt = formatMap[doc.inputFormat] || 'PDF';
      var outFmt = outputMap[doc.outputFormat] || 'Excel (XLSX)';
      metaEl.textContent = inFmt + ' to ' + outFmt + ' \u2022 Processed ' + new Date(doc.processedAt).toLocaleString() + ' \u2022 ' + (doc.fileSize / 1024 / 1024).toFixed(1) + ' MB';
    }

    var badge = document.getElementById('overall-badge');
    if (badge) {
      var score = doc.overallConfidence;
      if (score >= 90) {
        badge.className = 'inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400';
      } else if (score >= 70) {
        badge.className = 'inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400';
      } else {
        badge.className = 'inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400';
      }
      badge.innerHTML = '<span class="h-2 w-2 rounded-full ' + (score >= 90 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-red-500') + '"></span> ' + score + '% confidence';
    }

    var fieldsContainer = document.getElementById('fields-container');
    if (fieldsContainer) {
      fieldsContainer.innerHTML = doc.fields.map(function (f) {
        var needsReview = f.confidence < 90;
        var barColor = f.confidence >= 90 ? 'bg-emerald-500' : f.confidence >= 70 ? 'bg-amber-500' : 'bg-red-500';
        var barBg = f.confidence >= 90 ? 'bg-emerald-500/10' : f.confidence >= 70 ? 'bg-amber-500/10' : 'bg-red-500/10';
        var textColor = f.confidence >= 90 ? 'text-emerald-400' : f.confidence >= 70 ? 'text-amber-400' : 'text-red-400';
        var rowBg = needsReview ? 'bg-amber-500/[0.03]' : '';

        var ruleFlags = (f._ruleFlags || []).map(function (msg) {
          return '<span class="inline-flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-xs font-medium text-red-400" title="' + msg.replace(/"/g, '&quot;') + '"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Rule</span>';
        }).join('');

        var editHtml = '';
        if (needsReview) {
          editHtml = '<div class="mt-1 flex items-center gap-2">' +
            '<input type="text" value="' + f.value.replace(/"/g, '&quot;') + '" class="field-edit hidden w-full rounded-lg border border-amber-500/50 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 outline-none focus:border-amber-400" data-key="' + f.key + '" />' +
            '<button class="edit-btn text-xs text-amber-400 hover:text-amber-300" data-key="' + f.key + '">Edit</button>' +
            '<button class="save-btn hidden text-xs text-emerald-400 hover:text-emerald-300" data-key="' + f.key + '">Save</button>' +
            '<button class="cancel-btn hidden text-xs text-neutral-500 hover:text-neutral-400" data-key="' + f.key + '">Cancel</button>' +
          '</div>';
        }

        var flagHtml = needsReview
          ? '<span class="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-400"><svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg> Flagged</span>'
          : '';

        return '<div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-6 py-4 ' + rowBg + '">' +
          '<div class="sm:w-36 sm:shrink-0"><p class="text-sm text-neutral-400">' + f.label + '</p></div>' +
          '<div class="flex-1">' +
            '<p class="text-sm font-medium" data-key="' + f.key + '">' + f.value + '</p>' +
            editHtml +
          '</div>' +
          '<div class="flex items-center gap-3">' +
            '<div class="h-1.5 w-20 overflow-hidden rounded-full ' + barBg + '">' +
              '<div class="h-full rounded-full ' + barColor + '" style="width:' + f.confidence + '%"></div>' +
            '</div>' +
            '<span class="w-8 text-right text-xs font-medium ' + textColor + '">' + f.confidence + '%</span>' +
            flagHtml +
            ruleFlags +
          '</div>' +
        '</div>';
      }).join('');
    }

    var lineItemsBody = document.getElementById('line-items-body');
    var tableConfEl = document.getElementById('table-confidence');
    if (lineItemsBody && doc.lineItems) {
      lineItemsBody.innerHTML = doc.lineItems.map(function (li) {
        return '<tr class="border-b border-neutral-800 transition-colors hover:bg-neutral-900/30">' +
          '<td class="px-6 py-3 text-sm">' + li.description + '</td>' +
          '<td class="px-6 py-3 text-right text-sm">' + li.quantity + '</td>' +
          '<td class="px-6 py-3 text-right text-sm">$' + li.unit_price.toFixed(2) + '</td>' +
          '<td class="px-6 py-3 text-right text-sm font-medium">$' + li.total.toFixed(2) + '</td>' +
        '</tr>';
      }).join('');
    }
    if (tableConfEl) {
      var tc = doc.lineItemsConfidence || 85;
      tableConfEl.textContent = tc + '% confidence';
      tableConfEl.className = 'text-xs font-medium ' + (tc >= 90 ? 'text-emerald-400' : tc >= 70 ? 'text-amber-400' : 'text-red-400');
    }

    var reviewItems = document.getElementById('review-items');
    if (reviewItems) {
      var flagged = doc.fields.filter(function (f) { return f.confidence < 90 || (f._ruleFlags && f._ruleFlags.length > 0); });
      if (flagged.length === 0) {
        reviewItems.innerHTML = '<p class="text-sm text-neutral-500">No items need review.</p>';
      } else {
        reviewItems.innerHTML = flagged.map(function (f) {
          var reasons = [];
          if (f.confidence < 90) reasons.push(f.confidence + '% confidence');
          if (f._ruleFlags && f._ruleFlags.length > 0) reasons.push('Rule: ' + f._ruleFlags[0]);
          return '<div class="flex items-center justify-between rounded-lg bg-amber-500/5 px-3 py-2">' +
            '<div><p class="text-sm font-medium">' + f.label + '</p><p class="text-xs text-neutral-500">' + reasons.join(', ') + '</p></div>' +
            '<span class="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-400">Flagged</span>' +
          '</div>';
        }).join('');
      }
    }

    var rawTextEl = document.getElementById('raw-text');
    if (rawTextEl && doc.rawText) {
      rawTextEl.textContent = doc.rawText;
    }

    document.querySelectorAll('.edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-key');
        var input = document.querySelector('.field-edit[data-key="' + key + '"]');
        var valEl = document.querySelector('p[data-key="' + key + '"]');
        if (input && valEl) {
          input.classList.remove('hidden');
          input.value = valEl.textContent;
          valEl.classList.add('hidden');
          btn.classList.add('hidden');
          document.querySelector('.save-btn[data-key="' + key + '"]')?.classList.remove('hidden');
          document.querySelector('.cancel-btn[data-key="' + key + '"]')?.classList.remove('hidden');
        }
      });
    });

    document.querySelectorAll('.save-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-key');
        var input = document.querySelector('.field-edit[data-key="' + key + '"]');
        var valEl = document.querySelector('p[data-key="' + key + '"]');
        if (input && valEl) {
          var newVal = input.value;
          valEl.textContent = newVal;
          valEl.classList.remove('hidden');
          input.classList.add('hidden');
          btn.classList.add('hidden');
          document.querySelector('.cancel-btn[data-key="' + key + '"]')?.classList.add('hidden');
          document.querySelector('.edit-btn[data-key="' + key + '"]')?.classList.remove('hidden');

          doc.fields = doc.fields.map(function (f) {
            if (f.key === key) {
              return { key: f.key, label: f.label, value: newVal, confidence: Math.min(100, f.confidence + 5) };
            }
            return f;
          });
          window.DocDataEntry.saveLocalDocument(doc);
          applyBusinessRules(doc);
          renderDocument(doc);
        }
      });
    });

    document.querySelectorAll('.cancel-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-key');
        var input = document.querySelector('.field-edit[data-key="' + key + '"]');
        var valEl = document.querySelector('p[data-key="' + key + '"]');
        if (input && valEl) {
          input.value = valEl.textContent;
          input.classList.add('hidden');
          valEl.classList.remove('hidden');
          btn.classList.add('hidden');
          document.querySelector('.save-btn[data-key="' + key + '"]')?.classList.add('hidden');
          document.querySelector('.edit-btn[data-key="' + key + '"]')?.classList.remove('hidden');
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDocument);
  } else {
    loadDocument();
  }
})();
