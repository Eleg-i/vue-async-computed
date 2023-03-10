import { setAsyncState } from './util'

/** */
export function errorHandler({ vm, key, pluginOptions, err }) {
  setAsyncState(vm, key, 'error')
  vm.$set(vm.$data._asyncComputed[key], 'exception', err)
  if (pluginOptions.errorHandler === false) return

  const handler =
    pluginOptions.errorHandler === undefined
      ? () => {
        err.message = 'Error evaluating async computed property:' + err.message
        throw err
      }
      : pluginOptions.errorHandler

  if (pluginOptions.useRawError) {
    return handler(err, vm, err.stack)
  } else {
    return handler(err.stack)
  }
}
