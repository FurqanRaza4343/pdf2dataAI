(function () {
  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');
  var uploadPrompt = document.getElementById('upload-prompt');
  var uploadProgress = document.getElementById('upload-progress');
  var progressText = document.getElementById('progress-text');
  var progressBar = document.getElementById('progress-bar');
  var formatBadge = document.getElementById('format-badge');
  var fileQueueEl = document.getElementById('file-queue');
  var batchDoneEl = document.getElementById('batch-done');

  if (!dropZone || !fileInput) return;

  var inputFormat = '';
  var outputFormat = '';
  try {
    inputFormat = localStorage.getItem('docdataentry_input_format') || 'pdf';
    outputFormat = localStorage.getItem('docdataentry_output_format') || 'xlsx';
  } catch (err) {}
  if (formatBadge) {
    var formatMap = { pdf: 'PDF', image: 'Image', word: 'Word' };
    var outputMap = { xlsx: 'Excel', csv: 'CSV', json: 'JSON', xml: 'XML' };
    formatBadge.textContent = (formatMap[inputFormat] || 'PDF') + ' to ' + (outputMap[outputFormat] || 'Excel (XLSX)');
    formatBadge.classList.remove('opacity-0');
    formatBadge.classList.add('opacity-100');
  }

  var queue = {};
  var totalFiles = 0;
  var completedFiles = 0;

  function getStatusHTML(fileName, status, confidence) {
    var icon = '';
    var label = '';
    switch (status) {
      case 'queued':
        icon = '<svg class="h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
        label = 'Queued';
        break;
      case 'extracting':
        icon = '<svg class="h-4 w-4 animate-spin text-brand-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>';
        label = 'Extracting...';
        break;
      case 'done':
        icon = '<svg class="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
        label = 'Done ' + (confidence !== undefined ? '(' + confidence + '%)' : '');
        break;
      case 'failed':
        icon = '<svg class="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
        label = 'Failed';
        break;
    }
    return '<div class="flex items-center gap-2 text-sm">' + icon + '<span class="' + (status === 'done' ? 'text-emerald-400' : status === 'failed' ? 'text-red-400' : status === 'extracting' ? 'text-brand-400' : 'text-neutral-500') + '">' + label + '</span></div>';
  }

  function getFileIcon(fileName) {
    var ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'tiff', 'webp'].includes(ext)) return 'image';
    if (['doc', 'docx'].includes(ext)) return 'word';
    return 'file';
  }

  function addFileToQueue(fileName) {
    var row = document.createElement('div');
    row.id = 'queue-' + fileName.replace(/[^a-zA-Z0-9]/g, '_');
    row.className = 'flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 transition-all';
    row.innerHTML =
      '<div class="flex items-center gap-3 min-w-0">' +
        '<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-400">' +
          '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>' +
        '</div>' +
        '<p class="truncate text-sm font-medium">' + fileName + '</p>' +
      '</div>' +
      '<div id="status-' + fileName.replace(/[^a-zA-Z0-9]/g, '_') + '">' + getStatusHTML(fileName, 'queued') + '</div>';
    fileQueueEl.appendChild(row);
  }

  function updateFileStatus(fileName, status, confidence) {
    var id = 'status-' + fileName.replace(/[^a-zA-Z0-9]/g, '_');
    var el = document.getElementById(id);
    if (el) el.innerHTML = getStatusHTML(fileName, status, confidence);
  }

  function handleFiles(files) {
    if (!files || files.length === 0) return;

    totalFiles = files.length;
    completedFiles = 0;

    uploadPrompt.classList.add('hidden');
    uploadProgress.classList.remove('hidden');
    batchDoneEl.classList.add('hidden');
    fileQueueEl.classList.remove('hidden');
    fileQueueEl.innerHTML = '';

    for (var i = 0; i < files.length; i++) {
      addFileToQueue(files[i].name);
    }

    updateOverallProgress();

    window.DocDataEntry.extractBatch(files, function (fileName, status, completed, total) {
      if (status === 'extracting') {
        updateFileStatus(fileName, 'extracting');
      } else if (status === 'done') {
        var doc = window.DocDataEntry.getLocalDocuments().filter(function (d) { return d.fileName === fileName; });
        var confidence = doc.length > 0 ? doc[0].overallConfidence : undefined;
        updateFileStatus(fileName, 'done', confidence);
        completedFiles++;
      } else if (status === 'failed') {
        updateFileStatus(fileName, 'failed');
        completedFiles++;
      }
      updateOverallProgress();

      if (completedFiles === total) {
        progressText.textContent = 'All files processed!';
        progressBar.style.width = '100%';
        batchDoneEl.classList.remove('hidden');
      }
    });
  }

  function updateOverallProgress() {
    var pct = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0;
    progressText.textContent = 'Processing ' + completedFiles + ' of ' + totalFiles + ' files...';
    progressBar.style.width = pct + '%';
  }

  fileInput.addEventListener('change', function () {
    handleFiles(fileInput.files);
  });

  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('border-brand-500', 'bg-brand-500/[0.03]');
  });

  dropZone.addEventListener('dragleave', function () {
    dropZone.classList.remove('border-brand-500', 'bg-brand-500/[0.03]');
  });

  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('border-brand-500', 'bg-brand-500/[0.03]');
    handleFiles(e.dataTransfer.files);
  });
})();
