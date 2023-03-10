import Vue from 'vue'
import AsyncComputed from '../src'
import test from 'tape'

const baseErrorCallback = () => {
  // throw new Error('Unexpected error thrown')
  console.error('Unexpected error thrown')
},
      pluginOptions = {
        errorHandler: msg => baseErrorCallback(msg)
      }

Vue.use(AsyncComputed, pluginOptions)

test('Async computed values are computed', t => {
  t.plan(8)
  const vm = new Vue({
    props: {
      z: {
        default: {}
      }
    },
    data() {
      return {
        x: 'x',
        y: this.z.m
      }
    },
    asyncComputed: {
      a() {
        return new Promise(resolve => {
          setTimeout(() => resolve('done'), 100)
        })
      },
      async b() {
        const a = await this.a

        return new Promise(resolve => {
          setTimeout(() => resolve(a + 1337), 20)
        })
      },
      async c() {
        const b = await this.b

        return b + this.x
      },
      async d() {
        return await this.c + 'd'
      }
    }
  })

  ;(async () => {
    t.equal(vm.a instanceof Promise, true, 'a 应该为 promise')
    t.equal(vm.b instanceof Promise, true, 'b 应该为 promise')
    t.equal(await vm.a, 'done', 'a 应该为 done')
    t.equal(await vm.b, 'done1337', 'b 应该为 done1337')
    t.equal(await vm.c, 'done1337x', 'c 应该为 done1337x')
    t.equal(await vm.d, 'done1337xd', 'c 应该为 done1337xd')

    vm.x = 'xx'

    const unWatch = vm.$watch('c', async val => {
      unWatch()
      t.equal(await vm.c, 'done1337xx', 'c 应该为 done1337xx')
      t.equal(await vm.d, 'done1337xxd', 'c 应该为 done1337xxd')
    })
  })()
})

test('An async computed value which is an pre-resolved promise updates at the next tick', t => {
  t.plan(2)
  const vm = new Vue({
    asyncComputed: {
      a() {
        return Promise.resolve('done')
      }
    }
  })

  t.equal(vm.a instanceof Promise, true)
  Vue.nextTick(() => t.equal(vm.a, 'done'))
})

test('Sync and async computed data work together', t => {
  t.plan(4)
  const vm = new Vue({
    asyncComputed: {
      a() {
        return new Promise(resolve => {
          setTimeout(() => resolve('done'), 10)
        })
      }
    },
    computed: {
      b() {
        return 0
      }
    }
  })

  t.equal(vm.a instanceof Promise, true)

  t.equal(vm.b, 0)

  vm.$watch('a', function (val) {
    t.equal(val, 'done')
    t.equal(vm.b, 0)
  })
})

test('Async values are properly recalculated', t => {
  t.plan(7)
  const vm = new Vue({
    asyncComputed: {
      a() {
        const data = this.x

        return new Promise(resolve => {
          setTimeout(() => resolve(data), 10)
        })
      },
      b() {
        return new Promise(resolve => {
          setTimeout(() => resolve('done'), 40)
        })
      }
    },
    data: {
      x: 0
    }
  })

  t.equal(vm.a instanceof Promise, true)
  t.equal(vm.x, 0)

  const unwatch = vm.$watch('a', function (val) {
    let count = 1

    t.equal(val, 0)
    unwatch()
    this.x = 1
    t.equal(vm.a, 0)
    vm.$watch('a', function (val) {
      if (count === 1) t.equal(val instanceof Promise, true)
      else t.equal(val, 1)
      count++
    })
  })

  vm.$watch('b', function (val) {
    t.equal(val, 'done')
  })
})

test('Old async values are properly invalidated', t => {
  t.plan(2)
  const vm = new Vue({
    asyncComputed: {
      a() {
        return new Promise(resolve => {
          setTimeout(() => resolve(this.waitTime), this.waitTime)
        })
      }
    },
    data: {
      waitTime: 40
    }
  })

  t.equal(vm.a instanceof Promise, true)
  setTimeout(() => {
    vm.waitTime = 10
  }, 10)
  vm.$watch('a', function (val) {
    t.equal(val, 10) // Not 40, even though we don't cancel the $watch
  })
})

test('Having only sync computed data still works', t => {
  t.plan(2)
  const vm = new Vue({
    computed: {
      a() {
        return this.x
      }
    },
    data: {
      x: 2
    }
  })

  t.equal(vm.a, 2)
  vm.$watch('a', function (val) {
    t.equal(val, 3)
  })
  vm.x++
})

test('Errors in computed properties are handled', t => {
  t.plan(3)
  const vm = new Vue({
    asyncComputed: {
      a() {
        return new Promise((resolve, rej) => {
          setTimeout(() => rej(new Error('myError')), 200)
        })
      }
    }
  })

  t.equal(vm.a instanceof Promise, true)
  pluginOptions.errorHandler = stack => {
    t.equal(vm.a instanceof Promise, true)
    t.equal(stack.slice(0, 15), 'Error: myError\n')
    pluginOptions.errorHandler = baseErrorCallback
  }
})

test('Errors in computed properties are handled, with useRawError', t => {
  pluginOptions.useRawError = true
  t.plan(3)
  const vm = new Vue({
    asyncComputed: {
      a() {
        // eslint-disable-next-line prefer-promise-reject-errors
        return Promise.reject('error')
      }
    }
  })

  t.equal(vm.a instanceof Promise, true)
  pluginOptions.errorHandler = err => {
    t.equal(vm.a instanceof Promise, true)
    t.equal(err, 'error')
    pluginOptions.errorHandler = baseErrorCallback
    pluginOptions.useRawError = false
  }
})

test('Multiple asyncComputed objects are handled the same as normal computed property objects', t => {
  t.plan(3)
  const vm = new Vue({
    mixins: [
      {
        asyncComputed: {
          a() {
            return Promise.resolve('mixin-a')
          },
          b() {
            return Promise.resolve('mixin-b')
          }
        }
      }
    ],
    asyncComputed: {
      a() {
        return Promise.resolve('vm-a')
      },
      c() {
        return Promise.resolve('vm-c')
      }
    }
  })

  Vue.nextTick(() => {
    t.equal(vm.a, 'vm-a')
    t.equal(vm.b, 'mixin-b')
    t.equal(vm.c, 'vm-c')
  })
})

test('Async computed values can have defaults', t => {
  t.plan(8)
  const vm = new Vue({
    asyncComputed: {
      x: {
        default: false,
        get() {
          return Promise.resolve(true)
        }
      },
      y() {
        return Promise.resolve(true)
      },
      z: {
        get() {
          return Promise.resolve(true)
        }
      }
    },
    watch: {
      x: {
        deep: true,
        immediate: true,
        handler(newValue, oldValue) {
          if (oldValue === undefined) {
            t.equal(newValue, false, 'watch: x should default to false')
          }
        }
      }
    },
    computed: {
      computedFromX() {
        t.equal(this.x, false, 'computed: x should default to false')

        return this.x
      }
    }
  }),
        computed = vm.computedFromX // Force computed execution

  t.equal(vm.x, false, 'x should default to false')
  t.equal(vm.y instanceof Promise, true, 'y doesn\'t have a default')
  t.equal(vm.z instanceof Promise, true, 'z doesn\'t have a default despite being defined with an object')
  Vue.nextTick(() => {
    t.equal(vm.x, true, 'x resolves to true')
    t.equal(vm.y, true, 'y resolves to true')
    t.equal(vm.z, true, 'z resolves to true')
  })
})

test('Default values can be functions', t => {
  t.plan(4)
  const vm = new Vue({
    data: {
      x: 1
    },
    asyncComputed: {
      y: {
        default() {
          return 2
        },
        get() {
          return Promise.resolve(3)
        }
      },
      z: {
        default() {
          return this.x
        },
        get() {
          return Promise.resolve(4)
        }
      }
    }
  })

  t.equal(vm.y, 2)
  t.equal(vm.z, 1, 'z 应为 1')
  Vue.nextTick(() => {
    t.equal(vm.y, 3)
    t.equal(vm.z, 4)
  })
})

test('Async computed values can be written to, and then will be properly overridden', t => {
  t.plan(6)
  const vm = new Vue({
    data: {
      x: 1
    },
    asyncComputed: {
      y() {
        this.y = this.x + 1

        return new Promise(resolve => {
          setTimeout(() => resolve(this.x), 10)
        })
      }
    }
  })

  Vue.nextTick(() => {
    t.equal(vm.y, 2, 'y 应为 2')
    const unwatch = vm.$watch('y', function (val) {
      t.equal(val, 1, 'y 应为 1')
      unwatch()
      vm.x = 4
      t.equal(vm.y, 1, '3.y 应为 1')
      Vue.nextTick(async () => {
        t.equal(vm.y instanceof Promise, true, 'y 应为 Promise')
        vm.$watch('y', function (val) {
          t.equal(val, 4, 'y 应为 4')
        })
        t.equal(await vm.y, 4, 'await y 应为 5') // this.y 被重写后，立即被 return 的 Promise 覆盖掉
      })
    })
  })
})

test('Watchers rerun the computation when a value changes', t => {
  t.plan(4)
  let i = 0
  const vm = new Vue({
    data: {
      x: 0,
      y: 2
    },
    asyncComputed: {
      z: {
        get() {
          return Promise.resolve(i + this.y)
        },
        watch() {
          // eslint-disable-next-line no-unused-expressions
          this.x
        }
      }
    }
  })

  t.equal(vm.z instanceof Promise, true)
  Vue.nextTick(() => {
    t.equal(vm.z, 2)
    i++
    vm.x--
    Vue.nextTick(() => {
      // This tick, Vue registers the change
      // in the watcher, and reevaluates
      // the getter function
      t.equal(vm.z instanceof Promise, true, 'z 应为 Promise')
      Vue.nextTick(() => {
        // Now in this tick the promise has
        // resolved, and z is 3.
        t.equal(vm.z, 3)
      })
    })
  })
})

test('shouldUpdate controls when to rerun the computation when a value changes', t => {
  t.plan(6)
  let i = 0
  const vm = new Vue({
    data: {
      x: 0,
      y: 2
    },
    asyncComputed: {
      z: {
        get() {
          return Promise.resolve(i + this.y)
        },
        shouldUpdate() {
          return this.x % 2 === 0
        }
      }
    }
  })

  t.equal(vm.z instanceof Promise, true)
  Vue.nextTick(() => {
    t.equal(vm.z, 2)
    i++
    // update x so it will be 1
    // should update returns false now
    vm.x++
    Vue.nextTick(() => {
      // This tick, Vue registers the change
      // in the watcher, and reevaluates
      // the getter function
      t.equal(vm.z, 2)
      Vue.nextTick(() => {
        // Now in this tick the promise has
        // resolved, and z is 2 since should update returned false.
        t.equal(vm.z, 2)
        // update x so it will be 2
        // should update returns true now
        vm.x++
        Vue.nextTick(() => {
          // This tick, Vue registers the change
          // in the watcher, and reevaluates
          // the getter function
          t.equal(vm.z instanceof Promise, true, 'z 应为 Promise')
          Vue.nextTick(() => {
            // Now in this tick the promise has
            // resolved, and z is 3.
            t.equal(vm.z, 3)
          })
        })
      })
    })
  })
})

test('Watchers trigger but shouldUpdate can still block their updates', t => {
  t.plan(6)
  let i = 0
  const vm = new Vue({
    data: {
      canUpdate: true,
      x: 0,
      y: 2
    },
    asyncComputed: {
      z: {
        get() {
          return Promise.resolve(i + this.y)
        },
        watch() {
          // eslint-disable-next-line no-unused-expressions
          this.x
        },
        shouldUpdate() {
          return this.canUpdate
        }
      }
    }
  })

  t.equal(vm.z instanceof Promise, true, 'z 应为 Promise')
  Vue.nextTick(() => {
    t.equal(vm.z, 2)
    i++
    vm.x--
    Vue.nextTick(() => {
      // This tick, Vue registers the change
      // in the watcher, and reevaluates
      // the getter function
      t.equal(vm.z instanceof Promise, true, 'z 应为 Promise')
      Vue.nextTick(() => {
        // Now in this tick the promise has
        // resolved, and z is 3.
        t.equal(vm.z, 3)
        // We stop all updates from now on
        vm.canUpdate = false
        i++
        vm.x--
        Vue.nextTick(() => {
          // This tick, Vue registers the change
          // in the watcher, and reevaluates
          // the getter function but no update
          t.equal(vm.z, 3)
          Vue.nextTick(() => {
            // Now in this tick the promise has
            // resolved, and z is still 3.
            t.equal(vm.z, 3)
          })
        })
      })
    })
  })
})

test('The default default value can be set in the plugin options', t => {
  t.plan(2)
  pluginOptions.default = 53
  const vm = new Vue({
    asyncComputed: {
      x() {
        return Promise.resolve(0)
      }
    }
  })

  t.equal(vm.x, 53)
  Vue.nextTick(() => {
    t.equal(vm.x, 0)
    delete pluginOptions.default
  })
})

test('The default default value can be set to undefined in the plugin options', t => {
  t.plan(2)
  pluginOptions.default = undefined
  const vm = new Vue({
    asyncComputed: {
      x() {
        return Promise.resolve(0)
      }
    }
  })

  t.equal(vm.x, undefined, 'x 应该为 undefined')
  Vue.nextTick(() => {
    t.equal(vm.x, 0, 'x 应该为 0')
    delete pluginOptions.default
  })
})

test('Handle an async computed value returning synchronously', t => {
  t.plan(2)
  const vm = new Vue({
    asyncComputed: {
      x() {
        return 1
      }
    }
  })

  t.equal(vm.x instanceof Promise, true)
  Vue.nextTick(() => {
    t.equal(vm.x, 1)
  })
})

test('Work correctly with Vue.extend', t => {
  t.plan(2)
  const SubVue = Vue.extend({
    asyncComputed: {
      x() {
        return Promise.resolve(1)
      }
    }
  }),
        vm = new SubVue({})

  t.equal(vm.x instanceof Promise, true)
  Vue.nextTick(() => {
    t.equal(vm.x, 1)
  })
})

test('Async computed values can be calculated lazily', t => {
  t.plan(8)

  let called = false
  const vm = new Vue({
    asyncComputed: {
      a: {
        lazy: true,
        get() {
          called = true

          return new Promise(resolve => {
            setTimeout(() => resolve(10), 100)
          })
        }
      },
      b: {
        lazy: true,
        async get() {
          await this.a

          return 100
        }
      }
    }
  })

  t.equal(called, false, '应该为未调用')
  Vue.nextTick(() => {
    t.equal(called, false, '应该为未调用')
    t.equal(vm.a instanceof Promise, true)
    t.equal(vm.b instanceof Promise, true)
    t.equal(called, false, '应该为未调用')
    Vue.nextTick(() => {
      t.equal(called, true, '应该为已调用')
      Vue.nextTick(async () => {
        t.equal(await vm.a, 10, 'a应该为10')
      })
    })
  })
  ;(async () => {
    t.equal(await vm.b, 100, 'b应该为100')
  })()
})

test('Async computed values aren\'t lazy with { lazy: false }', t => {
  t.plan(4)

  let called = false
  const vm = new Vue({
    asyncComputed: {
      a: {
        lazy: false,
        get() {
          called = true

          return Promise.resolve(10)
        }
      }
    }
  })

  t.equal(called, true)
  t.equal(vm.a instanceof Promise, true)
  Vue.nextTick(() => {
    t.equal(called, true)
    t.equal(vm.a, 10)
  })
})

test('Async computed values can be calculated lazily with a default', t => {
  t.plan(6)

  let called = false
  const vm = new Vue({
    asyncComputed: {
      a: {
        lazy: true,
        default: 3,
        get() {
          called = true

          return Promise.resolve(4)
        }
      }
    }
  })

  t.equal(called, false)
  Vue.nextTick(() => {
    t.equal(called, false)
    t.equal(vm.a, 3, 'a 应为 3')
    t.equal(called, false)
    Vue.nextTick(() => {
      t.equal(called, true)
      Vue.nextTick(() => {
        t.equal(vm.a, 4)
      })
    })
  })
})

test('Underscore prefixes work (issue #33)', t => {
  t.plan(4)
  const vm = new Vue({
    computed: {
      sync_a() {
        return 1
      },
      _sync_b() {
        return 2
      }
    },
    data() {
      return { a_complete: false }
    },
    asyncComputed: {
      _async_a() {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(this.sync_a)
            this.a_complete = true
          }, 10)
        })
      },
      async_b() {
        return new Promise(resolve => {
          setTimeout(() => resolve(this._sync_b), 10)
        })
      }
    }
  })

  t.equal(vm._async_a instanceof Promise, true, '_async_a 应为 Promise')
  t.equal(vm.async_b instanceof Promise, true, 'async_b 应为 Promise')
  // _async_a is not reactive, because
  // it begins with an underscore
  // so we'll watch 'a_complete' to know once
  // async_a has been computed.
  vm.$watch('a_complete', function (val) {
    t.equal(vm._async_a, 1)
  })
  vm.$watch('async_b', function (val) {
    t.equal(val, 2)
  })
})

test('shouldUpdate works with lazy', t => {
  t.plan(8)
  const vm = new Vue({
    data: {
      a: 0,
      x: true,
      y: false
    },
    asyncComputed: {
      b: {
        lazy: true,
        get() {
          return Promise.resolve(this.a)
        },
        shouldUpdate() {
          return this.x
        }
      },
      c: {
        lazy: true,
        get() {
          return Promise.resolve(this.a)
        },
        shouldUpdate() {
          return this.y
        }
      }
    }
  })

  Vue.nextTick(() => {
    t.equal(vm.b instanceof Promise, true)
    t.equal(vm.c instanceof Promise, true)
    Vue.nextTick(() => {
      Vue.nextTick(() => {
        t.equal(vm.b, 0)
        t.equal(vm.c instanceof Promise, true)
        vm.a++
        Vue.nextTick(() => {
          Vue.nextTick(() => {
            t.equal(vm.b, 1)
            t.equal(vm.c instanceof Promise, true)
            vm.x = false
            vm.y = true
            vm.a++
            Vue.nextTick(() => {
              Vue.nextTick(() => {
                t.equal(vm.b, 1)
                t.equal(vm.c, 2)
              })
            })
          })
        })
      })
    })
  })
})

test('$asyncComputed is empty if there are no async computed properties', t => {
  t.plan(1)
  const vm = new Vue({})

  t.deepEqual(vm.$asyncComputed, {})
})

test('$asyncComputed[name] is created for all async computed properties', t => {
  t.plan(15)
  const vm = new Vue({
    asyncComputed: {
      a() {
        return Promise.resolve(1)
      },
      b() {
        return Promise.resolve(2)
      }
    }
  })

  t.deepEqual(Object.keys(vm.$asyncComputed), ['a', 'b'])
  t.equal(vm.$asyncComputed.a.state, 'updating')
  t.equal(vm.$asyncComputed.b.state, 'updating')
  t.equal(vm.$asyncComputed.a.updating, true)
  t.equal(vm.$asyncComputed.a.success, false)
  t.equal(vm.$asyncComputed.a.error, false)
  t.equal(vm.$asyncComputed.a.exception, null)

  Vue.nextTick(() => {
    t.equal(vm.a, 1)
    t.equal(vm.b, 2)
    t.equal(vm.$asyncComputed.a.state, 'success')
    t.equal(vm.$asyncComputed.b.state, 'success')
    t.equal(vm.$asyncComputed.a.updating, false)
    t.equal(vm.$asyncComputed.a.success, true)
    t.equal(vm.$asyncComputed.a.error, false)
    t.equal(vm.$asyncComputed.a.exception, null)
  })
})

test('$asyncComputed[name] handles errors and captures exceptions', t => {
  t.plan(7)
  const vm = new Vue({
    asyncComputed: {
      a() {
        // eslint-disable-next-line prefer-promise-reject-errors
        return Promise.reject('error-message')
      }
    }
  })

  t.equal(vm.$asyncComputed.a.state, 'updating')
  pluginOptions.errorHandler = stack => {
    t.equal(vm.a instanceof Promise, true)
    t.equal(vm.$asyncComputed.a.state, 'error', 'state 为 error')
    t.equal(vm.$asyncComputed.a.updating, false)
    t.equal(vm.$asyncComputed.a.success, false)
    t.equal(vm.$asyncComputed.a.error, true)
    t.equal(vm.$asyncComputed.a.exception, 'error-message')
    pluginOptions.errorHandler = baseErrorCallback
  }
})

test('$asyncComputed[name].update triggers re-evaluation', t => {
  let valueToReturn = 1

  t.plan(5)
  const vm = new Vue({
    asyncComputed: {
      a() {
        return new Promise(resolve => {
          resolve(valueToReturn)
        })
      }
    }
  })

  Vue.nextTick(() => {
    t.equal(vm.a, 1)
    valueToReturn = 2
    t.equal(vm.$asyncComputed.a.state, 'success')
    vm.$asyncComputed.a.update()
    t.equal(vm.$asyncComputed.a.state, 'updating')

    Vue.nextTick(() => {
      t.equal(vm.a, 2)
      valueToReturn = 3

      Vue.nextTick(() => {
        t.equal(vm.a, 2)
      })
    })
  })
})

test('$asyncComputed[name].update has the correct execution context', t => {
  t.plan(8)
  let addedValue = 1
  const vm = new Vue({
    data() {
      return {
        valueToReturn: 1
      }
    },
    asyncComputed: {
      a() {
        return new Promise(resolve => {
          resolve(this.valueToReturn + addedValue)
        })
      },
      b: {
        get() {
          return new Promise(resolve => {
            resolve(this.valueToReturn + addedValue)
          })
        }
      }
    }
  })

  Vue.nextTick(() => {
    //  case 1: a is a function
    t.equal(vm.a, 2)
    t.equal(vm.$asyncComputed.a.state, 'success')
    //  case 2: b is an object with a getter function
    t.equal(vm.b, 2)
    t.equal(vm.$asyncComputed.b.state, 'success')

    addedValue = 4

    vm.$asyncComputed.a.update()
    t.equal(vm.$asyncComputed.a.state, 'updating')

    vm.$asyncComputed.b.update()
    t.equal(vm.$asyncComputed.b.state, 'updating')

    Vue.nextTick(() => {
      t.equal(vm.a, 5)
      t.equal(vm.b, 5)
    })
  })
})

test('Plain components with neither `data` nor `asyncComputed` still work (issue #50)', t => {
  t.plan(1)
  const vm = new Vue({
    computed: {
      a() {
        return 1
      }
    }
  })

  t.equal(vm.a, 1)
})

test('Data of component still work as function and got vm', t => {
  t.plan(1)
  let _vmContext = null
  const vm = new Vue({
    data(vmContext) {
      _vmContext = vmContext
    },
    asyncComputed: {
      async a() {
        return Promise.resolve(1)
      }
    }
  })

  t.equal(vm, _vmContext)
})

test('Watch as a function', t => {
  t.plan(4)
  let i = 0
  const vm = new Vue({
    data: {
      y: 2,
      obj: {
        t: 0
      }
    },
    asyncComputed: {
      z: {
        get() {
          return Promise.resolve(i + this.y)
        },
        watch() {
          // eslint-disable-next-line no-unused-expressions
          this.obj.t
        }
      }
    }
  })

  t.equal(vm.z instanceof Promise, true)
  Vue.nextTick(() => {
    t.equal(vm.z, 2, 'z 应为2')
    i++
    vm.obj.t--
    Vue.nextTick(() => {
      // This tick, Vue registers the change
      // in the watcher, and reevaluates
      // the getter function
      t.equal(vm.z instanceof Promise, true, 'z 应为 Promise')
      Vue.nextTick(() => {
        // Now in this tick the promise has
        // resolved, and z is 3.
        t.equal(vm.z, 3, 'z 应为3')
      })
    })
  })
})

test('Watchers as array with nested path rerun the computation when a value changes', t => {
  t.plan(4)
  let i = 0
  const vm = new Vue({
    data: {
      y: 2,
      obj: {
        t: 0
      }
    },
    asyncComputed: {
      z: {
        get() {
          return Promise.resolve(i + this.y)
        },
        watch: ['obj.t']
      }
    }
  })

  t.equal(vm.z instanceof Promise, true)
  Vue.nextTick(() => {
    t.equal(vm.z, 2)
    i++
    vm.obj.t--
    Vue.nextTick(() => {
      // This tick, Vue registers the change
      // in the watcher, and reevaluates
      // the getter function
      t.equal(vm.z instanceof Promise, true, 'z 应为 Promise')
      Vue.nextTick(() => {
        // Now in this tick the promise has
        // resolved, and z is 3.
        t.equal(vm.z, 3)
      })
    })
  })
})

test('Watch as array with more then one value', t => {
  t.plan(5)
  let i = 0
  const vm = new Vue({
    data: {
      y: 2,
      obj: {
        t: 0
      },
      r: 0
    },
    asyncComputed: {
      z: {
        get() {
          return Promise.resolve(i + this.y)
        },
        watch: ['obj.t', 'r']
      }
    }
  })

  t.equal(vm.z instanceof Promise, true)
  Vue.nextTick(() => {
    t.equal(vm.z, 2)
    i++
    // checking for nested property
    vm.obj.t--
    Vue.nextTick(() => {
      // This tick, Vue registers the change
      // in the watcher, and reevaluates
      // the getter function
      t.equal(vm.z instanceof Promise, true, 'z 应为 Promise')
      Vue.nextTick(() => {
        // Now in this tick the promise has
        // resolved, and z is 3.
        t.equal(vm.z, 3)

        i++
        // one level and multiple watchers
        vm.r--
        Vue.nextTick(() => {
          Vue.nextTick(() => {
            t.equal(vm.z, 4)
          })
        })
      })
    })
  })
})

test('$asyncComputed[name].state resolves to \'success\' even if the computed value is 0 (issue #75)', t => {
  t.plan(13)
  const vm = new Vue({
    computed: {
      isUpdating() {
        return this.$asyncComputed.a.updating
      }
    },
    asyncComputed: {
      a: {
        async get() {
          return 0
        },
        default: null
      }
    }
  })

  t.equal(vm.$asyncComputed.a.state, 'updating')
  t.equal(vm.$asyncComputed.a.updating, true)
  t.equal(vm.$asyncComputed.a.success, false)
  t.equal(vm.$asyncComputed.a.error, false)
  t.equal(vm.$asyncComputed.a.exception, null)
  t.equal(vm.isUpdating, true)

  Vue.nextTick(() => {
    t.equal(vm.a, 0)
    t.equal(vm.$asyncComputed.a.state, 'success')
    t.equal(vm.$asyncComputed.a.updating, false)
    t.equal(vm.$asyncComputed.a.success, true)
    t.equal(vm.$asyncComputed.a.error, false)
    t.equal(vm.$asyncComputed.a.exception, null)
    t.equal(vm.isUpdating, false)
  })
})

test('$asyncComputed[name].update does nothing if called after the component is destroyed', t => {
  t.plan(4)
  let i = 0
  const vm = new Vue({
    asyncComputed: {
      a: {
        async get() {
          return ++i
        }
      }
    }
  })

  t.equal(vm.a instanceof Promise, true)
  Vue.nextTick(() => {
    t.equal(vm.a, 1)
    vm.$destroy()
    vm.$asyncComputed.a.update()
    Vue.nextTick(() => {
      t.equal(i, 1)
      t.equal(vm.a, 1)
    })
  })
})
