class BrunoClipboard {
  constructor() {
    this.items = [];
  }

  /**
   * @param {Object} item - Item to copy
   */
  write(item) {
    this.items.unshift(item);
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
