class BrunoClipboard {
  constructor() {
    this.items = [];
  }

  /**
   * @param {Object} item - Item to copy
   */
  write(item) {
    // Limit to one item for now
    this.items = [item];
  }

  /**
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
