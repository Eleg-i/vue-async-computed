import { hasOwnProperty } from './util'
/** */
export function isComputedLazy(item) {
  return hasOwnProperty(item, 'lazy') && item.lazy
}

/** */
export function isLazyActive(vm, key) {
  return vm[lazyActivePrefix + key]
}

export const lazyActivePrefix = 'async_computed$lazy_active$',
             lazyDataPrefix = 'async_computed$lazy_data$'
/** */
export function initLazy(data, key, value) {
  data[lazyActivePrefix + key] = false
  data[lazyDataPrefix + key] = value
}

/** */
export function makeLazyComputed(key) {
  return {
    get() {
      this[lazyActivePrefix + key] = true

      return this[lazyDataPrefix + key]
    },
    set(value) {
      this[lazyDataPrefix + key] = value
    }
  }
}

/** */
export function silentSetLazy(vm, key, value) {
  vm[lazyDataPrefix + key] = value
}

/** */
export function silentGetLazy(vm, key) {
  return vm[lazyDataPrefix + key]
}
