/** */
export function setAsyncState(vm, stateObject, state) {
  vm.$set(vm.$data._asyncComputed[stateObject], 'state', state)
  vm.$set(vm.$data._asyncComputed[stateObject], 'updating', state === 'updating')
  vm.$set(vm.$data._asyncComputed[stateObject], 'error', state === 'error')
  vm.$set(vm.$data._asyncComputed[stateObject], 'success', state === 'success')
}

/** */
export function getterOnly(fn) {
  if (typeof fn === 'function') return fn

  return fn.get
}

/** */
export function hasOwnProperty(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property)
}

/** */
export function validOpt({ data, asyncComputed, computed }) {
  var dataKeys = []
  const computedKeys = Object.keys(computed || {})

  if (typeof data !== 'function' && data instanceof Object) dataKeys = Object.keys(data || {})

  for (const key in asyncComputed) {
    if (dataKeys.includes(key)) warn('data', key)
    else if (computedKeys.includes(key)) warn('computed', key)
  }
}

/**
 * 对冲突的键发起警告
 * @param {String} type 警告的类型
 * @param {String} key 键名称
 */
function warn(type, key) {
  console.warn(`[Vue warn] asyncComputed 属性名称冲突: ${type} 中已定义属性 ${key}`)
}
