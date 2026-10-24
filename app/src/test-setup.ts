import '@testing-library/jest-dom/vitest'

// jsdom does not implement <dialog> behaviour: do what the browser does, to the extent the app relies on it.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function () {
  if (!this.hasAttribute('open')) return
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
}
