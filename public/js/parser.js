const Parser = {
  parse(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const items = [];
    let subtotal = 0, tax = 0, tip = 0, total = 0;

    const priceRe = /(\d+\.\d{2})\s*$/;
    const qtyRe = /^(\d+)\s*[xX@]\s*/;
    const skipRe = /^(subtotal|sub total|total|tax|sales tax|tip|gratuity|balance|change|cash|credit|visa|mastercard|amex|card|thank|guest|table|server|order|check|date|time|tel|phone|fax|www\.|http)/i;
    const subtotalRe = /^(subtotal|sub[\s-]?total)/i;
    const taxRe = /^(sales\s*)?tax/i;
    const tipRe = /^(tip|gratuity)/i;
    const totalRe = /^(total|balance\s*due|amount\s*due|grand\s*total)/i;

    for (const line of lines) {
      const priceMatch = line.match(priceRe);
      if (!priceMatch) continue;
      const price = parseFloat(priceMatch[1]);
      let name = line.slice(0, priceMatch.index).trim();

      // Remove leading quantity
      const qtyMatch = name.match(qtyRe);
      let qty = 1;
      if (qtyMatch) {
        qty = parseInt(qtyMatch[1]);
        name = name.slice(qtyMatch[0].length).trim();
      }

      // Classify special lines
      if (subtotalRe.test(name)) { subtotal = price; continue; }
      if (taxRe.test(name)) { tax = price; continue; }
      if (tipRe.test(name)) { tip = price; continue; }
      if (totalRe.test(name)) { total = price; continue; }
      if (skipRe.test(name) || name.length < 2) continue;

      // Clean up name
      name = name.replace(/[.\-_]{3,}/g, ' ').replace(/\s{2,}/g, ' ').trim();
      if (!name) continue;

      if (qty > 1) {
        for (let i = 0; i < qty; i++) items.push({ name, price: +(price / qty).toFixed(2) });
      } else {
        items.push({ name, price });
      }
    }

    // Infer subtotal if not found
    if (!subtotal && items.length) subtotal = items.reduce((s, it) => s + it.price, 0);

    return { items, subtotal, tax, tip, total };
  }
};
