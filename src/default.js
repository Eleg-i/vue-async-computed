import { isComputedLazy, lazyActivePrefix, silentSetLazy } from './lazy'
import { errorHandler } from './error'

const defaultTimeout = 6000

export const asyncCptCallPerfix = '$asyncCptCall'

/** */
export function generateDefault(fn, pluginOptions, prefix) {
  let defaultValue = '_$undefined'

  if ('default' in fn) {
    defaultValue = fn.default
  } else if ('default' in pluginOptions) {
    defaultValue = pluginOptions.default
  } else if (defaultValue === '_$undefined') defaultValue = getDefaultPromise.call(this, { prefix, fn, pluginOptions })

  if (typeof defaultValue === 'function') {
    this.$once('hook:created', () => {
      const value = defaultValue.call(this, fn, pluginOptions),
            { key } = fn

      if (isComputedLazy(fn)) {
        silentSetLazy(this, key, value)
      } else {
        this[key] = value
      }
    })
  } else {
    return defaultValue
  }
}

/** */
export function getDefaultPromise({ prefix, fn, pluginOptions }) {
  const { key, timeout = pluginOptions.timeout || defaultTimeout } = fn

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(`asyncComputed 属性 “${key}” 异步执行栈超时${timeout / 1000}秒！`)
    }, timeout)

    /** */
    function handleError(err, vm) {
      try {
        resolve(errorHandler({ vm, key, pluginOptions, err }))
      } catch (newErr) {
        reject(newErr)
      }
    }

    this.$once('hook:created', async () => {
      if (isComputedLazy(fn)) {
        const unWatch = this.$watch(`${lazyActivePrefix}${key}`, async newVal => {
          if (newVal) {
            try {
              resolve(await this[`${prefix}${key}`])
            } catch (e) {
              handleError(e, this)
            } finally {
              clearTimeout(timer)
              unWatch()
            }
          }
        })
      } else {
        try {
          resolve(await this[`${prefix}${key}`])
        } catch (e) {
          handleError(e, this)
        } finally {
          clearTimeout(timer)
        }
      }
    })
  })
}
