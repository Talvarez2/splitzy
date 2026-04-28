const COLORS = ['#ff6b6b','#4ecdc4','#45b7d1','#f7dc6f','#bb8fce','#f0932b','#6c5ce7','#e17055','#00b894','#fd79a8'];

const People = {
  list: [],
  _nextId: 0,

  add(name) {
    name = name.trim();
    if (!name) return null;
    const person = { id: ++this._nextId, name, color: COLORS[(this._nextId - 1) % COLORS.length] };
    this.list.push(person);
    return person;
  },

  remove(id) { this.list = this.list.filter(p => p.id !== id); },
  get(id) { return this.list.find(p => p.id === id); },
  initials(name) { return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2); }
};
