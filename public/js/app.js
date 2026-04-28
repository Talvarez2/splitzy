const App = {
  state: { step: 'upload', imageDataUrl: null, items: [], tax: 0, tip: 0 },

  init() {
    this.bindUpload();
    this.bindNavigation();
    this.renderHistory();
  },

  renderHistory() {
    const history = JSON.parse(localStorage.getItem('splitzy_history') || '[]');
    if (!history.length) return;
    document.getElementById('history-section').classList.remove('hidden');
    document.getElementById('history-list').innerHTML = history.slice(0, 10).map(h => {
      const date = new Date(h.createdAt).toLocaleDateString();
      return `<div class="assign-row" style="cursor:pointer" onclick="window.open('/s/${h.id}?owner=1','_blank')">
        <span class="item-name">${date} — ${h.itemCount} items</span>
        <span class="item-price">$${h.total.toFixed(2)}</span>
        <span class="shared-badge">${Object.keys(h.selections || {}).length} responses</span>
      </div>`;
    }).join('');
  },

  saveToHistory(id) {
    const history = JSON.parse(localStorage.getItem('splitzy_history') || '[]');
    const total = this.state.items.reduce((s, it) => s + it.price, 0) + this.state.tax + this.state.tip;
    history.unshift({ id, itemCount: this.state.items.length, total, createdAt: Date.now(), selections: {} });
    localStorage.setItem('splitzy_history', JSON.stringify(history.slice(0, 20)));
  },

  _stepOrder: ['upload', 'items', 'people', 'summary'],

  showStep(name) {
    const oldIdx = this._stepOrder.indexOf(this.state.step);
    const newIdx = this._stepOrder.indexOf(name);
    const forward = newIdx >= oldIdx;
    document.querySelectorAll('.step').forEach(s => { s.classList.remove('active', 'slide-in-left', 'slide-in-right'); });
    const el = document.getElementById(`step-${name}`);
    el.classList.add('active', forward ? 'slide-in-left' : 'slide-in-right');
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

    dropZone.addEventListener('click', (e) => { if (e.target.closest('label, a')) return; fileInput.click(); });
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    document.getElementById('camera-input').addEventListener('change', (e) => handleFile(e.target.files[0]));
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });

    // Sample receipt
    document.getElementById('try-sample').addEventListener('click', async (e) => {
      e.preventDefault();
      const resp = await fetch('assets/sample-receipt.png');
      const blob = await resp.blob();
      handleFile(new File([blob], 'sample-receipt.png', { type: 'image/png' }));
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
    if (!parsed.items.length) {
      alert('OCR could not detect items automatically. You can add them manually using the "+ Add Item" button while referencing the receipt image on the left.');
    }
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
    // Sort: unassigned first, then grouped by assigned person
    const sorted = this.state.items.map((item, i) => ({ item, i }));
    sorted.sort((a, b) => {
      const aAssigned = a.item.assignedTo.length > 0;
      const bAssigned = b.item.assignedTo.length > 0;
      if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;
      if (aAssigned && bAssigned) {
        // Group by first assigned person
        return a.item.assignedTo[0] - b.item.assignedTo[0];
      }
      return 0;
    });
    list.innerHTML = sorted.map(({ item, i }) => {
      const assigned = item.assignedTo.length > 0;
      const tags = item.assignedTo.map(pid => {
        const p = People.get(pid);
        return p ? `<span class="assign-tag" style="background:${p.color}">${People.initials(p.name)}</span>` : '';
      }).join('');
      const shared = item.assignedTo.length > 1 ? '<span class="shared-badge">shared</span>' : '';
      const buttons = People.list.map(p => {
        const active = item.assignedTo.includes(p.id);
        return `<button class="btn btn-sm" style="background:${active ? p.color : 'transparent'}; color:${active ? '#fff' : p.color}; border-color:${p.color}; min-width:36px; padding:4px 8px;" onclick="App.toggleAssignment(${i},${p.id})">${People.initials(p.name)}</button>`;
      }).join('');
      return `<div class="assign-row${assigned ? ' assigned' : ''}">
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
    document.getElementById('save-group-btn').addEventListener('click', () => this.saveGroup());
    this.renderGroups();
    document.getElementById('next-to-summary').addEventListener('click', () => {
      this.renderSummary();
      this.showStep('summary');
    });
    document.getElementById('back-to-assign').addEventListener('click', () => this.showStep('people'));
    document.getElementById('share-bill').addEventListener('click', () => this.shareBill());
    document.getElementById('copy-summary').addEventListener('click', () => this.copySummary());
    document.getElementById('save-pdf').addEventListener('click', () => this.savePDF());
    document.getElementById('start-over').addEventListener('click', () => location.reload());
  },

  // --- Groups ---
  saveGroup() {
    if (!People.list.length) return;
    const name = prompt('Group name:');
    if (!name) return;
    const groups = JSON.parse(localStorage.getItem('splitzy_groups') || '[]');
    groups.push({ name, people: People.list.map(p => p.name) });
    localStorage.setItem('splitzy_groups', JSON.stringify(groups));
    this.renderGroups();
  },

  loadGroup(idx) {
    const groups = JSON.parse(localStorage.getItem('splitzy_groups') || '[]');
    const group = groups[idx];
    if (!group) return;
    People.list = []; People._nextId = 0;
    this.state.items.forEach(it => { it.assignedTo = []; });
    group.people.forEach(name => People.add(name));
    this.renderAssignment();
  },

  deleteGroup(idx) {
    const groups = JSON.parse(localStorage.getItem('splitzy_groups') || '[]');
    groups.splice(idx, 1);
    localStorage.setItem('splitzy_groups', JSON.stringify(groups));
    this.renderGroups();
  },

  renderGroups() {
    const groups = JSON.parse(localStorage.getItem('splitzy_groups') || '[]');
    const container = document.getElementById('group-list');
    if (!container) return;
    container.innerHTML = groups.map((g, i) =>
      `<span style="display:inline-flex;align-items:center;gap:2px"><button class="btn btn-sm" style="font-size:0.75rem" onclick="App.loadGroup(${i})">${this.escHtml(g.name)} (${g.people.length})</button><button class="btn btn-sm btn-danger" style="font-size:0.65rem;padding:2px 6px" onclick="App.deleteGroup(${i})">✕</button></span>`
    ).join('');
  },

  generateQR(url) {
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    document.getElementById('share-qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 4 });
  },

  async shareBill() {
    const btn = document.getElementById('share-bill');
    btn.disabled = true;
    btn.textContent = 'Creating link...';
    try {
      const venmoUser = document.getElementById('venmo-user').value.trim();
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: this.state.items.map(it => ({ name: it.name, price: it.price })),
          tax: this.state.tax,
          tip: this.state.tip,
          people: People.list.map(p => p.name),
          venmoUser,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      this.saveToHistory(data.id);
      const url = `${location.origin}/s/${data.id}`;
      document.getElementById('share-url-main').value = url;
      document.getElementById('owner-dashboard-link').href = `/s/${data.id}?owner=1`;
      this.generateQR(url);
      document.getElementById('copy-link-main').onclick = () => {
        navigator.clipboard.writeText(url);
        document.getElementById('copy-link-main').textContent = 'Copied!';
        setTimeout(() => document.getElementById('copy-link-main').textContent = 'Copy', 2000);
      };
      document.getElementById('share-result').classList.remove('hidden');
      btn.textContent = '✅ Link Created';
    } catch (e) {
      btn.textContent = '🔗 Share with Friends';
      btn.disabled = false;
      alert('Failed to create share link: ' + e.message);
    }
  },

  copySummary() {
    const results = Calculator.calculate(this.state.items, People.list, this.state.tax, this.state.tip);
    const lines = ['🍽️ Splitzy Bill Split', ''];
    results.forEach(r => {
      lines.push(`${r.person.name}: $${r.total.toFixed(2)}`);
      r.items.forEach(it => lines.push(`  ${it.name}${it.shared ? ` (÷${it.sharedWith})` : ''}: $${it.share.toFixed(2)}`));
      lines.push(`  Tax: $${r.tax.toFixed(2)} | Tip: $${r.tip.toFixed(2)}`);
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\n'));
    const btn = document.getElementById('copy-summary');
    btn.textContent = '✅ Copied!';
    setTimeout(() => btn.textContent = '📋 Copy Summary', 2000);
  },

  savePDF() {
    const summaryEl = document.getElementById('step-summary');
    // Hide buttons during print
    const buttons = summaryEl.querySelectorAll('.btn');
    buttons.forEach(b => b.style.display = 'none');
    window.print();
    buttons.forEach(b => b.style.display = '');
  },

  escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
};

document.addEventListener('DOMContentLoaded', () => App.init());
