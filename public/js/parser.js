const Parser = {
  parse(text) {
    console.log('--- OCR RAW TEXT ---');
    console.log(text);
    console.log('--- END OCR TEXT ---');

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const items = [];
    let subtotal = 0, tax = 0, tip = 0, total = 0;

    // Match prices: $14.99, 14.99, 14,99, 14. 99, etc at end of line
    const priceRe = /\$?\s*(\d{1,4})[.,]\s*(\d{2})\s*$/;
    // Also try: just a number with no decimal (e.g. "1499" meaning $14.99 is unlikely, skip)
    const qtyRe = /^(\d+)\s*[xX@]\s*/;
    const skipRe = /^(subtotal|sub\s*total|total|tax|sales\s*tax|tip|gratuity|balance|change|cash|credit|visa|mastercard|amex|card|thank|guest|table|server|order|check|date|time|tel|phone|fax|www\.|http|receipt|invoice|welcome|visit)/i;
    const subtotalRe = /sub\s*-?\s*total/i;
    const taxRe = /(sales\s*)?tax/i;
    const tipRe = /\b(tip|gratuity)\b/i;
    const totalRe = /\b(total|balance\s*due|amount\s*due|grand\s*total)\b/i;

    for (const line of lines) {
      const priceMatch = line.match(priceRe);
      if (!priceMatch) continue;

      const price = parseFloat(priceMatch[1] + '.' + priceMatch[2]);
      if (price <= 0) continue;

      let name = line.slice(0, priceMatch.index).trim();
      // Strip leading dollar signs, dots, dashes
      name = name.replace(/^[\$\.\-\s]+/, '').trim();

      // Remove leading quantity
      const qtyMatch = name.match(qtyRe);
      let qty = 1;
      if (qtyMatch) {
        qty = parseInt(qtyMatch[1]);
        name = name.slice(qtyMatch[0].length).trim();
      }

      // Classify special lines — check the whole line too, not just name
      const fullLine = line.toLowerCase();
      if (subtotalRe.test(name) || subtotalRe.test(fullLine)) { subtotal = price; continue; }
      if (taxRe.test(name) && !name.match(/taxi|taxicab/i)) { tax = price; continue; }
      if (tipRe.test(name) || tipRe.test(fullLine)) { tip = price; continue; }
      if (totalRe.test(name) || totalRe.test(fullLine)) {
        // Only set total if it looks like a total (usually the biggest number)
        if (!subtotalRe.test(fullLine)) { total = price; continue; }
      }
      if (skipRe.test(name) || name.length < 2) continue;

      // Clean up name: remove filler dots/dashes, extra spaces
      name = name.replace(/[.\-_]{2,}/g, ' ').replace(/\s{2,}/g, ' ').trim();
      if (!name) continue;

      if (qty > 1) {
        for (let i = 0; i < qty; i++) items.push({ name, price: +(price / qty).toFixed(2) });
      } else {
        items.push({ name, price });
      }
    }

    // Infer subtotal if not found
    if (!subtotal && items.length) subtotal = items.reduce((s, it) => s + it.price, 0);

    console.log('Parsed:', { items, subtotal, tax, tip, total });
    return { items, subtotal, tax, tip, total };
  }
};
