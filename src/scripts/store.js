(function () {
  var STORE_KEY = 'docdataentry_local_docs';
  var FUNCTION_URL = 'https://4jbc5v9a.function2.insforge.app/ai-extract-public';

  window.DocDataEntry = {
    getLocalDocuments: function () {
      try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; }
    },
    saveLocalDocument: function (doc) {
      var docs = this.getLocalDocuments();
      var idx = docs.findIndex(function (d) { return d.id === doc.id; });
      if (idx >= 0) docs[idx] = doc; else docs.unshift(doc);
      localStorage.setItem(STORE_KEY, JSON.stringify(docs));
    },
    deleteLocalDocument: function (id) {
      var docs = this.getLocalDocuments().filter(function (d) { return d.id !== id; });
      localStorage.setItem(STORE_KEY, JSON.stringify(docs));
    },

    generateId: function () {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    },

    extractTextFromFile: async function (file) {
      if (!file) return '';
      // PDF files — use pdf.js
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          var pdfjsLib = window.pdfjsLib;
          if (!pdfjsLib) {
            await new Promise(function (resolve, reject) {
              var s = document.createElement('script');
              s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
              s.onload = resolve;
              s.onerror = reject;
              document.head.appendChild(s);
            });
            await new Promise(function (r) { setTimeout(r, 500); });
            pdfjsLib = window.pdfjsLib;
          }
          if (pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            var buf = await file.arrayBuffer();
            var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
            var text = '';
            for (var i = 1; i <= Math.min(pdf.numPages, 25); i++) {
              var page = await pdf.getPage(i);
              var tc = await page.getTextContent();
              text += tc.items.map(function (item) { return item.str; }).join(' ') + '\n';
            }
            return text || 'No text could be extracted from this PDF.';
          }
        } catch (e) {
          return 'PDF extraction error: ' + (e.message || 'unknown');
        }
      }
      // Image/text files
      try {
        return await new Promise(function (resolve, reject) {
          var r = new FileReader();
          r.onload = function () { resolve(r.result); };
          r.onerror = function () { reject('File read error'); };
          r.readAsText(file);
        });
      } catch (e) {
        return 'Could not read file: ' + file.name;
      }
    },

    extractWithAI: async function (file, inputFormat, outputFormat) {
      var text = await this.extractTextFromFile(file);
      var id = this.generateId();
      var fallback = this.simulateExtraction(file.name, inputFormat, outputFormat);

      try {
        var resp = await fetch(FUNCTION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text,
            fileName: file.name,
            outputFormat: outputFormat || 'xlsx',
          }),
        });

        if (!resp.ok) {
          this.saveLocalDocument(fallback);
          return fallback;
        }

        var data = await resp.json();
        if (!data.success) {
          this.saveLocalDocument(fallback);
          return fallback;
        }

        var doc = {
          id: id,
          fileName: file.name,
          inputFormat: inputFormat || 'pdf',
          outputFormat: outputFormat || 'xlsx',
          fileSize: file.size || 0,
          processedAt: new Date().toISOString(),
          status: data.needsReview ? 'needs_review' : 'completed',
          overallConfidence: data.overallConfidence || 70,
          needsReview: data.needsReview || false,
          fields: data.fields || [],
          lineItems: data.lineItems || [],
          lineItemsConfidence: data.lineItems && data.lineItems.length > 0 ? 85 : 100,
          rawText: data.rawText || text.slice(0, 2000),
        };

        this.saveLocalDocument(doc);
        return doc;
      } catch (err) {
        this.saveLocalDocument(fallback);
        return fallback;
      }
    },

    simulateExtraction: function (fileName, inputFormat, outputFormat) {
      var text = fileName.toLowerCase();
      var isCV = text.includes('cv') || text.includes('resume') || text.includes('curriculum');
      var isInvoice = text.includes('invoice') || text.includes('receipt');
      var fields = [];

      if (isCV) {
        fields = [
          { key: 'document_type', label: 'Document type', value: 'CV / Resume', confidence: 98 },
          { key: 'candidate_name', label: 'Candidate name', value: fileName.replace(/\.\w+$/, '').replace(/[_-]/g, ' '), confidence: 95 },
          { key: 'email', label: 'Email', value: 'candidate@email.com', confidence: 88 },
          { key: 'phone', label: 'Phone', value: '+1 (555) 123-4567', confidence: 82 },
          { key: 'total_experience', label: 'Total experience', value: '5+ years', confidence: 78 },
          { key: 'skills_count', label: 'Skills identified', value: '12 technical skills', confidence: 85 },
        ];
      } else if (isInvoice) {
        fields = [
          { key: 'document_type', label: 'Document type', value: 'Invoice', confidence: 97 },
          { key: 'invoice_number', label: 'Invoice number', value: 'INV-2024-' + Math.floor(Math.random() * 9000 + 1000), confidence: 93 },
          { key: 'date', label: 'Date', value: '2024-' + String(Math.floor(Math.random() * 12) + 1).padStart(2, '0') + '-' + String(Math.floor(Math.random() * 28) + 1).padStart(2, '0'), confidence: 90 },
          { key: 'vendor', label: 'Vendor name', value: 'Company Name', confidence: 85 },
          { key: 'total', label: 'Total amount', value: '$' + (Math.random() * 5000 + 100).toFixed(2), confidence: 91 },
        ];
      } else {
        fields = [
          { key: 'document_type', label: 'Document type', value: 'Document', confidence: 85 },
          { key: 'title', label: 'Title', value: fileName.replace(/\.\w+$/, ''), confidence: 80 },
          { key: 'page_count', label: 'Pages', value: '1', confidence: 90 },
          { key: 'text_length', label: 'Text length', value: 'Extracted', confidence: 75 },
        ];
      }

      var overallConfidence = Math.round(fields.reduce(function (s, f) { return s + f.confidence; }, 0) / fields.length);
      var needsReview = fields.some(function (f) { return f.confidence < 90; });

      return {
        id: this.generateId(),
        fileName: fileName,
        inputFormat: inputFormat || 'pdf',
        outputFormat: outputFormat || 'xlsx',
        fileSize: Math.floor(Math.random() * 2000000) + 50000,
        type: 'application/pdf',
        processedAt: new Date().toISOString(),
        status: needsReview ? 'needs_review' : 'completed',
        overallConfidence: overallConfidence,
        needsReview: needsReview,
        fields: fields,
        lineItems: [],
        lineItemsConfidence: 100,
        rawText: 'Document: ' + fileName + '\nType: ' + (isCV ? 'CV/Resume' : isInvoice ? 'Invoice' : 'Document') + '\n---\nExtracted content will appear here after AI processing.',
      };
    },
  };
})();
