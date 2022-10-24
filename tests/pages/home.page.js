exports.HomePage = class HomePage {
  constructor(page) {
    this.page = page;
    this.loadSampleCollectionSelector = page.getByText('Load Sample Collection');
    this.sampeCollectionSelector = page.getByText('sample-collection');
    this.getUsersSelector = page.getByText('Users');
    this.getSingleUserSelector = page.getByText('Single User');
    this.getUserNotFoundSelector = page.getByText('User Not Found');
    this.postCreateSelector = page.getByText('Create');
    this.putUpdateSelector = page.getByText('Update');
    this.sendRequestButton = page.locator('div:nth-child(2) > .flex > svg');
    this.statusRequestSuccess = page.getByText('200 OK');
    this.statusRequestNotFound = page.getByText('404 Not Found');
    this.statusRequestCreated = page.getByText('201 Created');
  }

  async open() {
    await this.page.goto('/');
  }

  async loadSampleCollection() {
    await this.loadSampleCollectionSelector.click();
  }

  async getUsers() {
    await this.sampeCollectionSelector.click();
    await this.getUsersSelector.click();
    await this.sendRequestButton.click();
  }

  async getSingleUser() {
    await this.getSingleUserSelector.click();
    await this.sendRequestButton.click();
  }

  async getUserNotFound() {
    await this.getUserNotFoundSelector.click();
    await this.sendRequestButton.click();
  }

  async createUser() {
    await this.postCreateSelector.click();
    await this.sendRequestButton.click();
  }

  async updateUser() {
    await this.putUpdateSelector.click();
    await this.sendRequestButton.click();
  }
}
