(function () {
  var dropZone = document.getElementById('drop-zone');
  var fileInput = document.getElementById('file-input');
  var uploadPrompt = document.getElementById('upload-prompt');
  var uploadProgress = document.getElementById('upload-progress');
  var progressText = document.getElementById('progress-text');
  var progressBar = document.getElementById('progress-bar');
  var formatBadge = document.getElementById('format-badge');

  if (!dropZone || !fileInput) return;

  var inputFormat = '';
  var outputFormat = '';
  try {
    inputFormat = localStorage.getItem('pdf2dataai_input_format') || 'pdf';
    outputFormat = localStorage.getItem('pdf2dataai_output_format') || 'xlsx';
  } catch (err) {}
  if (formatBadge) {
    var formatMap = { pdf: 'PDF', image: 'Image', word: 'Word' };
    var outputMap = { xlsx: 'Excel', csv: 'CSV', json: 'JSON', xml: 'XML' };
    formatBadge.textContent = (formatMap[inputFormat] || 'PDF') + ' to ' + (outputMap[outputFormat] || 'Excel (XLSX)');
    formatBadge.classList.remove('opacity-0');
    formatBadge.classList.add('opacity-100');
  }

  var stages = [
    { text: 'Reading document content...', pct: 10 },
    { text: 'Connecting to AI extraction engine...', pct: 25 },
    { text: 'Analyzing document structure...', pct: 40 },
    { text: 'Extracting fields with Mistral AI...', pct: 60 },
    { text: 'Calculating confidence scores...', pct: 80 },
    { text: 'Finalizing results...', pct: 95 },
  ];

  function handleFile(file) {
    if (!file) return;

    uploadPrompt.classList.add('hidden');
    uploadProgress.classList.remove('hidden');

    var step = 0;
    var interval = setInterval(function () {
      if (step < stages.length) {
        var s = stages[step];
        progressText.textContent = s.text;
        progressBar.style.width = s.pct + '%';
        step++;
      } else {
        clearInterval(interval);
        progressBar.style.width = '100%';
        progressText.textContent = 'Extraction complete! Redirecting...';
        setTimeout(function () {
          window.PDF2DataAI.extractWithAI(file, inputFormat, outputFormat).then(function (doc) {
            if (doc && doc.id) {
              window.location.href = '/extract/?id=' + doc.id;
            } else {
              progressText.textContent = 'Extraction failed. Try again.';
            }
          });
        }, 400);
      }
    }, 400);
  }

  fileInput.addEventListener('change', function () {
    handleFile(fileInput.files[0]);
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
    var file = e.dataTransfer.files[0];
    handleFile(file);
  });
})();
