const Parser = {
  parse(text) {
    console.log('--- OCR RAW TEXT ---');
    console.log(text);
    console.log('--- END OCR TEXT ---');

    // Pre-process: join lines where price is on the next line
    const rawLines = text.split('\n');
    const joined = [];
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (!line) continue;
      // If this line is just a price (e.g. "$12.50"), attach to previous line
      if (/^\$?\s*\d{1,4}[.,]\s*\d{2}\s*$/.test(line) && joined.length) {
        joined[joined.length - 1] += ' ' + line;
      } else {
        joined.push(line);
      }
    }

    const items = [];
    let subtotal = 0, tax = 0, tip = 0, total = 0;

    const priceRe = /\$?\s*(\d{1,4})[.,]\s*(\d{2})\s*$/;
    const qtyRe = /^(\d+)\s+/;
    const subtotalRe = /sub\s*-?\s*total/i;
    const taxRe = /\btax\b/i;
    const tipRe = /\b(tip|gratuity)\b/i;
    const totalRe = /\b(total|balance\s*due|amount\s*due|grand\s*total)\b/i;
    const skipRe = /^(subtotal|sub\s*total|total|tax|sales\s*tax|tip|gratuity|balance|change|cash|credit|visa|mastercard|amex|card|thank|guest|table|server|order|check|date|time|tel|phone|fax|www\.|http|receipt|invoice|welcome|visit|please|ordered|bellevue|street|grill|bar\s+and)/i;

    for (const line of joined) {
      const priceMatch = line.match(priceRe);
      if (!priceMatch) continue;

      const price = parseFloat(priceMatch[1] + '.' + priceMatch[2]);
      if (price <= 0) continue;

      let name = line.slice(0, priceMatch.index).trim();
      // Strip dollar signs, leading dots/dashes
      name = name.replace(/^[\$\.\-\s]+/, '').replace(/[\.\-_]+$/, '').trim();

      const fullLine = line.toLowerCase();

      // Classify special lines
      if (subtotalRe.test(fullLine)) { subtotal = price; continue; }
      if (tipRe.test(fullLine)) { tip = price; continue; }
      if (taxRe.test(name) && !name.match(/taxi/i)) { tax = price; continue; }
      if (totalRe.test(fullLine) && !subtotalRe.test(fullLine)) { total = price; continue; }
      if (skipRe.test(name) || name.length < 1) continue;

      // Clean up name
      name = name.replace(/[.\-_]{2,}/g, ' ').replace(/\s{2,}/g, ' ').trim();
      if (!name) continue;

      // Handle leading quantity: "3 Mac & Jack's Amber" → qty=3
      const qtyMatch = name.match(qtyRe);
      let qty = 1;
      if (qtyMatch) {
        const possibleQty = parseInt(qtyMatch[1]);
        const restOfName = name.slice(qtyMatch[0].length).trim();
        // Only treat as quantity if it's 1-9 and the rest looks like a name (has letters)
        if (possibleQty >= 1 && possibleQty <= 20 && /[a-zA-Z]/.test(restOfName)) {
          qty = possibleQty;
          name = restOfName;
        }
      }

      if (qty > 1) {
        const unitPrice = +(price / qty).toFixed(2);
        for (let i = 0; i < qty; i++) items.push({ name, price: unitPrice });
      } else {
        items.push({ name, price });
      }
    }

    // Infer subtotal if not found
    if (!subtotal && items.length) subtotal = items.reduce((s, it) => s + it.price, 0);

    console.log('Parsed:', { itemCount: items.length, subtotal, tax, tip, total });
    items.forEach(it => console.log('  ', it.name, '$' + it.price));
    return { items, subtotal, tax, tip, total };
  }
};
