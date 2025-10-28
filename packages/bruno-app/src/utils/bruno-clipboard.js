class BrunoClipboard {
  constructor() {
    this.items = [];
  }

  /**
   * Write items to Bruno's internal clipboard
   * @param {Object} item - Item to copy
   */
  write(item) {
    this.items.unshift(item);
  }

  /**
   * Read items from Bruno's internal clipboard
   * @returns {Object} Result with items array
   */
  read() {
    return {
      items: this.items,
      hasData: this.items.length > 0
    };
  }
}

const brunoClipboard = new BrunoClipboard();

export default brunoClipboard;
