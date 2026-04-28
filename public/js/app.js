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

    // Sample receipt
    document.getElementById('try-sample').addEventListener('click', async (e) => {
      e.preventDefault();
      const resp = await fetch('/assets/sample-receipt.svg');
      const blob = await resp.blob();
      handleFile(new File([blob], 'sample-receipt.svg', { type: 'image/svg+xml' }));
    });
  },

  onOCRComplete(text) {
    const parsed = Parser.parse(text);
    this.state.items = parsed.items.map((it, i) => ({ ...it, id: i, assignedTo: [] }));
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
  addItem() { this.state.items.push({ id: Date.now(), name: 'New Item', price: 0, assignedTo: [] }); this.renderItems(); },

  updateTotals() {
    this.state.tax = parseFloat(document.getElementById('tax-input').value) || 0;
    this.state.tip = parseFloat(document.getElementById('tip-input').value) || 0;
    const subtotal = this.state.items.reduce((s, it) => s + it.price, 0);
    document.getElementById('subtotal-display').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('total-display').textContent = `$${(subtotal + this.state.tax + this.state.tip).toFixed(2)}`;
  },

  // --- People & Assignment ---
  renderPeopleChips() {
    const container = document.getElementById('people-list');
    container.innerHTML = People.list.map(p => `
      <div class="person-chip" style="background:${p.color}20; border-color:${p.color}">
        <span class="avatar" style="background:${p.color}">${People.initials(p.name)}</span>
        <span>${this.escHtml(p.name)}</span>
        <button class="remove-person" onclick="App.removePerson(${p.id})">✕</button>
      </div>`).join('');
  },

  addPerson() {
    const input = document.getElementById('person-name-input');
    const person = People.add(input.value);
    if (!person) return;
    input.value = '';
    this.renderPeopleChips();
    this.renderAssignment();
  },

  removePerson(id) {
    People.remove(id);
    this.state.items.forEach(it => { it.assignedTo = it.assignedTo.filter(pid => pid !== id); });
    this.renderPeopleChips();
    this.renderAssignment();
  },

  toggleAssignment(itemIndex, personId) {
    const item = this.state.items[itemIndex];
    const idx = item.assignedTo.indexOf(personId);
    if (idx >= 0) item.assignedTo.splice(idx, 1);
    else item.assignedTo.push(personId);
    this.renderAssignment();
  },

  renderAssignment() {
    this.renderPeopleChips();
    const list = document.getElementById('assignment-list');
    list.innerHTML = this.state.items.map((item, i) => {
      const tags = item.assignedTo.map(pid => {
        const p = People.get(pid);
        return p ? `<span class="assign-tag" style="background:${p.color}">${People.initials(p.name)}</span>` : '';
      }).join('');
      const shared = item.assignedTo.length > 1 ? '<span class="shared-badge">shared</span>' : '';
      const buttons = People.list.map(p => {
        const active = item.assignedTo.includes(p.id);
        return `<button class="btn btn-sm" style="background:${active ? p.color : 'transparent'}; color:${active ? '#fff' : p.color}; border-color:${p.color}; min-width:36px; padding:4px 8px;" onclick="App.toggleAssignment(${i},${p.id})">${People.initials(p.name)}</button>`;
      }).join('');
      return `<div class="assign-row">
        <span class="item-name">${this.escHtml(item.name)}</span>
        <span class="item-price">$${item.price.toFixed(2)}</span>
        <span class="tags">${tags}${shared}</span>
        <span class="assign-buttons" style="display:flex;gap:4px">${buttons}</span>
      </div>`;
    }).join('');
  },

  // --- Summary ---
  renderSummary() {
    const results = Calculator.calculate(this.state.items, People.list, this.state.tax, this.state.tip);
    const unassigned = this.state.items.filter(it => !it.assignedTo.length);
    const warn = document.getElementById('unassigned-warning');
    warn.classList.toggle('hidden', !unassigned.length);
    if (unassigned.length) warn.textContent = `⚠️ ${unassigned.length} item(s) unassigned: ${unassigned.map(it => it.name).join(', ')}`;

    document.getElementById('summary-cards').innerHTML = results.map(r => `
      <div class="summary-card" style="border-color:${r.person.color}">
        <h3><span class="avatar-sm" style="background:${r.person.color}">${People.initials(r.person.name)}</span> ${this.escHtml(r.person.name)}</h3>
        <div class="summary-items">
          ${r.items.map(it => `<div class="row${it.shared ? ' shared' : ''}"><span>${this.escHtml(it.name)}${it.shared ? ` (÷${it.sharedWith})` : ''}</span><span>$${it.share.toFixed(2)}</span></div>`).join('')}
        </div>
        <div class="summary-subtotals">
          <div class="row"><span>Subtotal</span><span>$${r.subtotal.toFixed(2)}</span></div>
          <div class="row"><span>Tax</span><span>$${r.tax.toFixed(2)}</span></div>
          <div class="row"><span>Tip</span><span>$${r.tip.toFixed(2)}</span></div>
        </div>
        <div class="summary-total" style="border-color:${r.person.color}"><span>Total</span><span>$${r.total.toFixed(2)}</span></div>
      </div>`).join('');

    const billTotal = this.state.items.reduce((s, it) => s + it.price, 0) + this.state.tax + this.state.tip;
    const splitTotal = results.reduce((s, r) => s + r.total, 0);
    const diff = Math.abs(billTotal - splitTotal);
    const check = document.getElementById('total-check');
    if (diff < 0.02) {
      check.className = 'total-check match';
      check.textContent = `✓ Totals match: $${splitTotal.toFixed(2)}`;
    } else {
      check.className = 'total-check mismatch';
      check.textContent = `✗ Split total $${splitTotal.toFixed(2)} vs bill $${billTotal.toFixed(2)} (diff: $${diff.toFixed(2)})`;
    }
  },

  bindNavigation() {
    document.getElementById('add-item-btn').addEventListener('click', () => this.addItem());
    document.getElementById('tax-input').addEventListener('input', () => this.updateTotals());
    document.getElementById('tip-input').addEventListener('input', () => this.updateTotals());
    document.getElementById('next-to-people').addEventListener('click', () => {
      this.renderAssignment();
      this.showStep('people');
    });
    document.getElementById('add-person-btn').addEventListener('click', () => this.addPerson());
    document.getElementById('person-name-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') this.addPerson(); });
    document.getElementById('next-to-summary').addEventListener('click', () => {
      this.renderSummary();
      this.showStep('summary');
    });
    document.getElementById('back-to-assign').addEventListener('click', () => this.showStep('people'));
    document.getElementById('start-over').addEventListener('click', () => location.reload());
  },

  escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
};

document.addEventListener('DOMContentLoaded', () => App.init());
