import { checkAscPropsStatus, getterOnly, hasOwnProperty, setAsyncState, validOpt } from './util'
import { getGetterWithShouldUpdate, shouldNotUpdate } from './shouldUpdate'
import { initLazy, isComputedLazy, isLazyActive, makeLazyComputed, silentGetLazy, silentSetLazy } from './lazy'
import { errorHandler } from './error'
import { generateDefault } from './default'
import { getWatchedGetter } from './watch'

const prefix = '_async_computed$',
      AsyncComputed = {
        install(Vue, pluginOptions) {
          Vue.config.optionMergeStrategies.asyncComputed = Vue.config.optionMergeStrategies.computed

          Vue.mixin(getAsyncComputedMixin(pluginOptions))

          const { checkAscPropsStatusPrefix = '$' } = pluginOptions

          Vue.prototype[`${checkAscPropsStatusPrefix}checkAscPropsStatus`] = checkAscPropsStatus
        }
      }

/** */
function getAsyncComputedMixin(pluginOptions = {}) {
  return {
    data() {
      return {
        _asyncComputed: {}
      }
    },
    computed: {
      $asyncComputed() {
        return this.$data._asyncComputed
      }
    },
    beforeCreate() {
      const asyncComputed = this.$options.asyncComputed || {}

      if (!Object.keys(asyncComputed).length) return

      for (const key in asyncComputed) {
        const getter = getterFn(key, asyncComputed[key])

        this.$options.computed[prefix + key] = getter
      }

      this.$options.data = initDataWithAsyncComputed(this.$options, pluginOptions)
    },
    created() {
      for (const key in this.$options.asyncComputed || {}) {
        const item = this.$options.asyncComputed[key]

        if (/^(_|$)/.test(key)) {
          if (isComputedLazy(item)) {
            silentSetLazy(this, key, silentGetLazy(this, key))
          } else {
            this[key] = this.$data[key]
          }
        }

        handleAsyncComputedPropetyChanges(this, key, pluginOptions)
      }
    }
  }
}

const AsyncComputedMixin = getAsyncComputedMixin()

/** */
function handleAsyncComputedPropetyChanges(vm, key, pluginOptions) {
  let promiseId = 0
  const watcher = newPromise => {
    const thisPromise = ++promiseId

    if (shouldNotUpdate(newPromise)) return

    if (!newPromise || !newPromise.then) {
      newPromise = Promise.resolve(newPromise)
    }

    if (['success', 'error'].includes(vm.$data._asyncComputed[key].state)) vm[key] = newPromise
    // 此处添加 vm[key] = newPromise 效果与设置 default 一致，但会导致 watch 异步计算属性时首次 watch 会被执行两次（即触发两次 update）
    // if (!(pluginOptions.hasOwnProperty('default') || vm.$options.asyncComputed[key].hasOwnProperty('default'))) vm[key] = newPromise

    setAsyncState(vm, key, 'updating')

    newPromise
      .then(value => {
        if (thisPromise !== promiseId) return
        setAsyncState(vm, key, 'success')
        vm[key] = value
      })
      .catch(err => {
        if (thisPromise !== promiseId) return

        if (vm.$options.asyncComputed[key].hasOwnProperty('default')) {
          try {
            errorHandler({ vm, key, pluginOptions, err })
          } catch (e) {
            console.error(e)
          }
        }
      })
  }

  vm.$set(vm.$data._asyncComputed, key, {
    exception: null,
    update: () => {
      if (!vm._isDestroyed) {
        watcher(getterOnly(vm.$options.asyncComputed[key]).apply(vm))
      }
    }
  })
  setAsyncState(vm, key, 'updating')
  vm.$watch(prefix + key, watcher, { immediate: true })
}

/** */
function initDataWithAsyncComputed(options, pluginOptions) {
  const { data: optionData, computed } = options,
        asyncComputed = options.asyncComputed || {}

  return function vueAsyncComputedInjectedDataFn(vm) {
    const data = (typeof optionData === 'function' ? optionData.call(this, vm) : optionData) || {}

    validOpt({ computed, data, asyncComputed })

    for (const key in asyncComputed) {
      const item = this.$options.asyncComputed[key]

      item.key = key

      const value = generateDefault.call(this, item, pluginOptions, prefix)

      if (isComputedLazy(item)) {
        initLazy.call(this, data, key, value)
        this.$options.computed[key] = makeLazyComputed(key)
      } else {
        data[key] = value
      }
    }

    return data
  }
}

/** */
function getterFn(key, fn) {
  if (typeof fn === 'function') return fn

  let getter = fn.get

  if (hasOwnProperty(fn, 'watch')) {
    getter = getWatchedGetter(fn)
  }

  if (hasOwnProperty(fn, 'shouldUpdate')) {
    getter = getGetterWithShouldUpdate(fn, getter)
  }

  if (isComputedLazy(fn)) {
    const nonLazy = getter

    getter = function lazyGetter() {
      if (isLazyActive(this, key)) {
        return nonLazy.call(this)
      } else {
        return silentGetLazy(this, key)
      }
    }
  }

  return getter
}

export default AsyncComputed
export { AsyncComputed as AsyncComputedPlugin, AsyncComputedMixin }

/* istanbul ignore if */
if (typeof window !== 'undefined' && window.Vue) {
  // Auto install in dist mode
  window.Vue.use(AsyncComputed)
}
