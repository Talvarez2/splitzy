const App = {
  state: { step: 'upload', imageDataUrl: null, items: [], tax: 0, tip: 0 },

  init() {
    this.bindUpload();
    this.bindNavigation();
  },

  showStep(name) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${name}`).classList.add('active');
    this.state.step = name;
  },

  bindUpload() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const preview = document.getElementById('upload-preview');
    const receiptImg = document.getElementById('receipt-img');
    const progressFill = document.querySelector('#ocr-progress .progress-fill');

    const handleFile = async (file) => {
      if (!file || !file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      this.state.imageDataUrl = url;
      receiptImg.src = url;
      preview.classList.remove('hidden');
      dropZone.classList.add('hidden');
      document.getElementById('ocr-status').classList.remove('hidden');
      progressFill.style.width = '0%';

      try {
        const text = await OCR.recognize(url, (p) => {
          progressFill.style.width = `${Math.round(p * 100)}%`;
        });
        this.onOCRComplete(text);
      } catch (e) {
        document.getElementById('ocr-status').innerHTML = `<p style="color:var(--danger)">OCR failed: ${e.message}. You can add items manually.</p><button class="btn btn-sm" onclick="App.onOCRComplete('')">Continue Manually</button>`;
      }
    };

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
  },

  onOCRComplete(text) {
    const parsed = Parser.parse(text);
    this.state.items = parsed.items;
    this.state.tax = parsed.tax;
    this.state.tip = parsed.tip;
    document.getElementById('receipt-img-ref').src = this.state.imageDataUrl;
    this.renderItems();
    this.showStep('items');
  },

  renderItems() {
    const list = document.getElementById('items-list');
    list.innerHTML = this.state.items.map((item, i) => `
      <div class="item-row" data-index="${i}">
        <input type="text" value="${this.escHtml(item.name)}" onchange="App.updateItem(${i},'name',this.value)">
        <input type="number" step="0.01" value="${item.price.toFixed(2)}" onchange="App.updateItem(${i},'price',parseFloat(this.value)||0)">
        <button class="delete-btn" onclick="App.deleteItem(${i})">✕</button>
      </div>`).join('');
    document.getElementById('tax-input').value = this.state.tax.toFixed(2);
    document.getElementById('tip-input').value = this.state.tip.toFixed(2);
    this.updateTotals();
  },

  updateItem(i, field, value) { this.state.items[i][field] = value; this.updateTotals(); },
  deleteItem(i) { this.state.items.splice(i, 1); this.renderItems(); },
  addItem() { this.state.items.push({ name: 'New Item', price: 0 }); this.renderItems(); },

  updateTotals() {
    this.state.tax = parseFloat(document.getElementById('tax-input').value) || 0;
    this.state.tip = parseFloat(document.getElementById('tip-input').value) || 0;
    const subtotal = this.state.items.reduce((s, it) => s + it.price, 0);
    document.getElementById('subtotal-display').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('total-display').textContent = `$${(subtotal + this.state.tax + this.state.tip).toFixed(2)}`;
  },

  bindNavigation() {
    document.getElementById('add-item-btn').addEventListener('click', () => this.addItem());
    document.getElementById('tax-input').addEventListener('input', () => this.updateTotals());
    document.getElementById('tip-input').addEventListener('input', () => this.updateTotals());
    document.getElementById('next-to-people').addEventListener('click', () => {
      this.renderAssignment();
      this.showStep('people');
    });
    document.getElementById('next-to-summary').addEventListener('click', () => {
      this.renderSummary();
      this.showStep('summary');
    });
    document.getElementById('back-to-assign').addEventListener('click', () => this.showStep('people'));
    document.getElementById('start-over').addEventListener('click', () => location.reload());
  },

  // Stubs for later steps
  renderAssignment() {},
  renderSummary() {},

  escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
};

document.addEventListener('DOMContentLoaded', () => App.init());
