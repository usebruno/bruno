export const setupPolyfills = () => {
  // polyfill required to make react-pdf
  if (typeof Promise.withResolvers === "undefined") {
    if (typeof window !== 'undefined') {
      window.Promise.withResolvers = function () {
        let resolve, reject
        const promise = new Promise((res, rej) => {
          resolve = res
          reject = rej
        })
        return { promise, resolve, reject }
      }
    } else {
      global.Promise.withResolvers = function () {
        let resolve, reject
        const promise = new Promise((res, rej) => {
          resolve = res
          reject = rej
        })
        return { promise, resolve, reject }
      }
    }
  }
}