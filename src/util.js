const prefix = '_async_computed$'

/** */
export function setAsyncState(vm, stateObject, state) {
  vm.$set(vm.$data._asyncComputed[stateObject], 'state', state)
  vm.$set(vm.$data._asyncComputed[stateObject], 'updating', state === 'updating')
  vm.$set(vm.$data._asyncComputed[stateObject], 'error', state === 'error')
  vm.$set(vm.$data._asyncComputed[stateObject], 'success', state === 'success')
}

/** */
export function getAsyncState(vm, stateObjectKey) {
  return vm.$data._asyncComputed[stateObjectKey].state
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

/**
 * 检查计算属性的状态是否为全为指定状态
 * @param {String|Array} props 指定的属性名称，可以为属性名，或者属性名的数组
 * @param {Enum<String>} status 指定的状态，枚举类型，要求是 'updating', 'success', 'error'，三者之一
 * @return {Boolean} 是否符合指定状态，是为true，否则为false
 */
export function checkAscPropsStatus(props, status) {
  var innerProps

  if (typeof props === 'string') {
    innerProps = [props]
  } else if (Array.isArray(props)) {
    innerProps = props
  } else throw new Error('要求传入正确的属性名称！属性名称应为字符串，或者包含的字符串的数组。')

  // 收集对应属性的变化
  innerProps.forEach(prop => {
    this[prop], this[prefix + prop]
  })

  return innerProps.every(prop => status === getAsyncState(this, prop))
}
