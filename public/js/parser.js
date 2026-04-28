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
      if (/^\$?\s*\d{1,4}[.,]\s*\d{2}\s*$/.test(line) && joined.length) {
        joined[joined.length - 1] += ' ' + line;
      } else {
        joined.push(line);
      }
    }

    const items = [];
    let subtotal = 0, tax = 0, tip = 0, total = 0;

    // Match $price anywhere, or bare price (no $) like "0.00" at end-ish
    const priceRe = /\$\s*(\d{1,4})[.,]\s*(\d{2})/;
    const barePriceRe = /(\d{1,4})[.,](\d{2})\s*[\|\s]*$/;
    const qtyRe = /^(\d+)\s+/;
    const subtotalRe = /sub\s*-?\s*total/i;
    const taxRe = /\btax\b/i;
    const tipRe = /\b(tip|gratuity)\b/i;
    const totalRe = /\b(total|balance\s*due|amount\s*due|grand\s*total)\b/i;
    const skipRe = /^(guest|table|server|order|check|date|time|tel|phone|fax|www\.|http|receipt|invoice|welcome|visit|please|ordered)/i;

    for (const line of joined) {
      let priceMatch = line.match(priceRe);
      if (!priceMatch) priceMatch = line.match(barePriceRe);
      if (!priceMatch) continue;

      const price = parseFloat(priceMatch[1] + '.' + priceMatch[2]);
      if (price <= 0) continue;

      // Name is everything BEFORE the price match
      let name = line.slice(0, priceMatch.index).trim();

      // Strip OCR junk: leading non-alphanumeric chars, common artifacts
      name = name.replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9)]+$/, '').trim();
      // Strip short OCR noise prefixes: "SRE 2 520 Burger" → "2 520 Burger", "Sa Add" → "Add"
      name = name.replace(/^[A-Za-z]{1,4}\s+(?=\d+\s+[A-Z])/i, '');
      name = name.replace(/^[A-Za-z]{1,2}\s+(?=Add\b|Side\b|Hot\b)/i, '');

      const fullLine = line.toLowerCase();
      const nameLower = name.toLowerCase();

      // Classify special lines — be fuzzy since OCR mangles these
      if (subtotalRe.test(fullLine) || subtotalRe.test(nameLower)) { subtotal = price; continue; }
      if (tipRe.test(fullLine) || tipRe.test(nameLower)) { tip = price; continue; }
      if (taxRe.test(fullLine) || taxRe.test(nameLower)) { tax = price; continue; }
      if (totalRe.test(fullLine) || totalRe.test(nameLower)) { total = price; continue; }

      // Skip header/footer lines
      if (skipRe.test(name)) continue;
      // Skip if name is too short or all caps gibberish (OCR artifact)
      if (name.length < 2) continue;
      if (name.length <= 4 && !/[a-z]/.test(name) && !/^(IPA|ALE)$/i.test(name)) continue;

      // Clean up name
      name = name.replace(/[.\-_]{2,}/g, ' ').replace(/\s{2,}/g, ' ').trim();
      if (!name) continue;

      // Handle leading quantity
      const qtyMatch = name.match(qtyRe);
      let qty = 1;
      if (qtyMatch) {
        const possibleQty = parseInt(qtyMatch[1]);
        const restOfName = name.slice(qtyMatch[0].length).trim();
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

    if (!subtotal && items.length) subtotal = items.reduce((s, it) => s + it.price, 0);

    console.log('Parsed:', { itemCount: items.length, subtotal, tax, tip, total });
    items.forEach(it => console.log('  ', it.name, '$' + it.price));
    return { items, subtotal, tax, tip, total };
  }
};
