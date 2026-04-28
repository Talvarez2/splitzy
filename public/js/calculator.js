const Calculator = {
  calculate(items, people, tax, tip) {
    const subtotal = items.reduce((s, it) => s + it.price, 0);
    if (!subtotal || !people.length) return [];

    return people.map(person => {
      const myItems = [];
      let personSubtotal = 0;

      items.forEach(item => {
        if (!item.assignedTo.includes(person.id)) return;
        const share = item.price / item.assignedTo.length;
        personSubtotal += share;
        myItems.push({ name: item.name, price: item.price, share, shared: item.assignedTo.length > 1, sharedWith: item.assignedTo.length });
      });

      const ratio = personSubtotal / subtotal;
      const myTax = +(tax * ratio).toFixed(2);
      const myTip = +(tip * ratio).toFixed(2);
      const total = +(personSubtotal + myTax + myTip).toFixed(2);

      return { person, items: myItems, subtotal: +personSubtotal.toFixed(2), tax: myTax, tip: myTip, total };
    });
  }
};
