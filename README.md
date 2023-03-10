<big><h1 align="center">vue-async-computed</h1></big>

### 说明
此仓库为 [vue-async-computed](https://github.com/foxbenjaminfox/vue-async-computed) 的一个分支，主要增加一个 Promise 模式，修改了属性计算过程的默认值，其它与原插件完全相同，async computed 属性如果在计算过程中，且未定义任何 `default` 属性，则会将属性值设置为 `resolve` async computed 属性 `get` 方法返回值的 Promise 实例，借此可快捷简单的进行异步编程。

如果计算过程中参数错误，上述 Promise 实例会 `reject` 一个错误，若定义了全局的`errorHandler`，则会 `resolve` `errorHandler` 的返回值。

示例：

```js
new Vue({
  template: `
    <div v-if="usernameReady">{{ username }}</div>
  `,
  data: {
    userId: 1
  },
  computed: {
    /* 
    为应对 asyncComputed 异步计算属性默认返回 Promise 而无法在模版中使用 await 
    关键字，本插件提供全局实例方法 $checkAscPropsStatus，检测异步属性是否处于指
    定状态。这比直接对异步计算属性设置默认值为 false|null|undefined 然后使用
    v-if 判断异步计算属性要灵活得多。
    $checkAscPropsStatus 的前缀可以通过插件全局参数 
    checkAscPropsStatusPrefix 重新指定，默认为 '$'。
    Vue.use(AsyncComputed, { checkAscPropsStatusPrefix: '$' })
     */
    usernameReady() {
      return this.$checkAscPropsStatus('username', 'success')
    },
    usernamePasswordReady() {
      return this.$checkAscPropsStatus(['username', 'password'], 'success')
    }
  },
  asyncComputed: {
    username () {
      // Using vue-resource
      return Vue.http.get('/get-username-by-id/' + this.userId)
        // This assumes that this endpoint will send us a response
        // that contains something like this:
        // {
        //   "username": "username-goes-here"
        // }
        .then(response => response.data.username)
    }，
    async password() {
      var result
      const username = await this.username // 对异步计算属性进行依赖计算，依赖属性计算完成后继续往下执行，无需繁琐判断和监听，但需要注意避免循环依赖。

      /** 一些异步操作 **/ 
      const repsonse = await fetch(`/api?username=${username}`)

      result = repsonse.data.password

      return result
    },
    email:{
      /* 
      手动设置默认值后，异步计算属性在初始化时会使用 default 设置的默认值，
      而非 Promise. 
      */
      default: null,
      async get() {
        /* expression */
      }
    },
    timeout: {
      get() {
        /* 
        此属性会抛出一个异常，因为处理的时间超过了指定的超时时间。添加此超时机制
        是为了防止产生被遗忘的 Promise，如果一个 Promise 一直没有 resolve，将
        会产生内存泄露风险。 
        */
        return new Promise(resolve => { setTimeout(() => resolve() ,6001) })
      },
      /* 
      默认为 6000，单位毫秒，必须为大于 0 的数字。
      可以使用 Vue.use(AsyncComputed, { timeout: 6000 }) 重新指定全局超时时间。
      */
      timeout: 6000 
    }
  },
  watch: {
    password(newVal) {
      /* 
      异步计算属性如果发生重新计算，在重新计算的过程中，异步计算属性会被修改为一
      个新 Promise 实例，并 resolve 新的计算结果，而非原插件的‘旧值’。计算完成
      后，异步计算属性会被再次替换为计算结果。 
      */
      newVal instanceof Promise // 在更新属性时为 true，更新完成后为 false
    }
  },
  async created() {
    // 直接打印 username、password 的异步结果
    console.log(await this.username, await this.password); 
  }
})
```

### 以下为原插件部分文档

With this plugin, you can have computed properties in Vue that are computed asynchronously.

Without using this plugin, you can't do this:

```js
new Vue({
  data: {
    userId: 1
  },
  computed: {
    username () {
      // Using vue-resource
      return Vue.http.get('/get-username-by-id/' + this.userId)
        // This assumes that this endpoint will send us a response
        // that contains something like this:
        // {
        //   "username": "username-goes-here"
        // }
        .then(response => response.data.username)
    }
  }
})
```

Or rather, you could, but it wouldn't do what you'd want it to do. But using this plugin, it works just like you'd expect:

```js
new Vue({
  data: {
    userId: 1
  },
  asyncComputed: {
    username () {
      return Vue.http.get('/get-username-by-id/' + this.userId)
        .then(response => response.data.username)
    }
  }
}
```

This is especially useful with ES7 async functions:

```js
new Vue({
  asyncComputed: {
    async someCalculation () {
      const x = await someAsycFunction()
      const y = await anotherAsyncFunction()
      return x + y
    }
  }
})
```

## Install

```sh
npm install --save vue-async-computed
```

Alternately, you can link it directly from a CDN:

```html
<script src="https://unpkg.com/vue-async-computed"></script>
<!--
  That will always point to the latest version of vue-async-computed.
  You probably want to instead pin it to a specific version:
-->
<script src="https://unpkg.com/vue-async-computed@3.9.0"></script>
```

When used with a module system such as `webpack` or `browserify`, you need to explicitly install `vue-async-computed` via `Vue.use()`:

```js
import Vue from 'vue'
import AsyncComputed from 'vue-async-computed'

Vue.use(AsyncComputed)
```

You don't need to do this when using global script tags. So long as you include `vue-async-computed` in a script tag after Vue itself, it will be installed automatically.

## Usage example

```js
import AsyncComputed from 'vue-async-computed'

/* Initialize the plugin */
Vue.use(AsyncComputed)

/*
   Then, when you create a Vue instance (or component),
   you can pass an object named "asyncComputed" as well as
   or instead of the standard "computed" option. The functions
   you pass to "asyncComputed" should return promises, and the values
   those promises resolve to are then asynchronously bound to the
   Vue instance as they resolve. Just as with normal computed
   properties, if the data the property depends on changes
   then the property is re-run automatically.

   You can almost completely ignore the fact that behind the
   scenes they are asynchronous. The one thing to remember is
   that until a asynchronous property's promise resolves
   for the first time, the value of the computed property is null.
*/

const vm = new Vue({
  data: {
    x: 2,
    y: 3
  },
  asyncComputed: {
    sum () {
      const total = this.x + this.y
      return new Promise(resolve =>
        setTimeout(() => resolve(total), 1000)
      )
    }
  }
})

/*
   Until one second has passed, vm.sum will be null.  After that,
   vm.sum will be 5. If you change vm.x or vm.y, then one
   second later vm.sum will automatically update itself to be
   the sum of the values to which you set vm.x and vm.y the previous second.
*/
```

[Like with regular synchronous computed properties](https://vuejs.org/guide/computed.html#Computed-Setter), you can pass an object
with a `get` method instead of a function, but unlike regular computed
properties, async computed properties are always getter-only. If the
object provided has a `set` method it will be ignored.

Async computed properties can also have a custom default value, which will
be used until the data is loaded for the first time:

```js
new Vue({
  data: {
    postId: 1
  },
  asyncComputed: {
    blogPostContent: {
      // The `get` function is the same as the function you would
      // pass directly as the value to `blogPostContent` if you
      // didn't need to specify a default value.
      get () {
        return Vue.http.get('/post/' + this.postId)
          .then(response => response.data.postContent)
       },
       // The computed proporty `blogPostContent` will have
       // the value 'Loading...' until the first time the promise
       // returned from the `get` function resolves.
       default: 'Loading...'
    }
  }
}

/*
   Now you can display {{blogPostContent}} in your template, which
   will show a loading message until the blog post's content arrives
   from the server.
*/
```

You can instead define the default value as a function, in order to depend on
props or on data:

```js
new Vue({
  data: {
    postId: 1
  },
  asyncComputed: {
    blogPostContent: {
      get () {
        return Vue.http.get('/post/' + this.postId)
          .then(response => response.data.postContent)
      },
      default () {
        return 'Loading post ' + this.postId
      }
    }
  }
}
```

You can also set a custom global default value in the options passed to `Vue.use`:

```javascript
Vue.use(AsyncComputed, {
  default: 'Global default value'
})
```

## Recalculation

Just like normal computed properties, async computed properties keep track of their dependencies, and are only
recalculated if those dependencies change. But often you'll have an async computed property you'll want to run again
without any of its (local) dependencies changing, such as for instance the data may have changed in the database.

You can set up a `watch` property, listing the additional dependencies to watch.
Your async computed property will then be recalculated also if any of the watched
dependencies change, in addition to the real dependencies the property itself has:

```js

new Vue({
  data: {
    postId: 1,
    timesPostHasBeenUpdated: 0
  },
  asyncComputed: {
    // blogPostContent will update its contents if postId is changed
    // to point to a diffrent post, but will also refetch the post's
    // contents when you increment timesPostHasBeenUpdated.
    blogPostContent: {
      get () {
        return Vue.http.get('/post/' + this.postId)
          .then(response => response.data.postContent)
      },
      watch: ['timesPostHasBeenUpdated']
    }
  }
}
```

Just like with Vue's normal `watch`, you can use a dotted path in order to watch a nested property. For example, `watch: ['a.b.c', 'd.e']` would declare a dependancy on `this.a.b.c` and on `this.d.e`.

You can trigger re-computation of an async computed property manually, e.g. to re-try if an error occured during evaluation. This should be avoided if you are able to achieve the same result using a watched property.

````js

new Vue({
  asyncComputed: {
    blogPosts: {
      get () {
        return Vue.http.get('/posts')
          .then(response => response.data)
      },
    }
  },
  methods: {
    refresh() {
      // Triggers an immediate update of blogPosts
      // Will work even if an update is in progress.
      this.$asyncComputed.blogPosts.update();
    }
  }
}
````

### Conditional Recalculation

Using `watch` it is possible to force the computed property to run again unconditionally.
If you need more control over when the computation should be rerun you can use `shouldUpdate`:

```js

new Vue({
  data: {
    postId: 1,
    // Imagine pageType can be one of 'index', 'details' and 'edit'.
    pageType: 'index'
  },
  asyncComputed: {
    blogPostContent: {
      get () {
        return Vue.http.get('/post/' + this.postId)
          .then(response => response.data.postContent)
      },
      // Will update whenever the pageType or postId changes,
      // but only if the pageType is not 'index'. This way the
      // blogPostContent will be refetched only when loading the
      // 'details' and 'edit' pages.
      shouldUpdate () {
        return this.pageType !== 'index'
      }
    }
  }
}
```

The main advantage over adding an `if` statement within the get function is that the old value is still accessible even if the computation is not re-run.

## Lazy properties

Normally, computed properties are both run immediately, and re-run as necessary when their dependencies change.
With async computed properties, you sometimes don't want that. With `lazy: true`, an async computed
property will only be computed the first time it's accessed.

For example:

```js
new Vue({
  data: {
    id: 1
  },
  asyncComputed: {
    mightNotBeNeeded: {
      lazy: true,
      get () {
        return Vue.http.get('/might-not-be-needed/' + this.id)
          .then(response => response.data.value)
      }
      // The value of `mightNotBeNeeded` will only be
      // calculated when it is first accessed.
    }
  }
}
```

## Computation status

For each async computed property, an object is added to `$asyncComputed` that contains information about the current computation state of that object. This object contains the following properties:

```js
{
  // Can be one of updating, success, error
  state: 'updating',
  // A boolean that is true while the property is updating.
  updating: true,
  // The property finished updating wihtout errors (the promise was resolved) and the current value is available.
  success: false,
  // The promise was rejected.
  error: false,
  // The raw error/exception with which the promise was rejected.
  exception: null
}
```

It is meant to be used in your rendering code to display update / error information.

````js
new Vue({
  asyncComputed: {
    posts() {
      return Vue.http.get('/posts')
        .then(response => response.data)
      }
    }
  }
}
// This will display a loading message every time the posts are updated:
// <div v-if="$asyncComputed.posts.updating"> (Re)loading posts </div>

// If you only want to display the message the first time the posts load, you can use the fact that the default value is null:
// <div v-if="$asyncComputed.posts.updating && posts === null"> Loading posts </div>

// You can display an error message if loading the posts failed.
// The vue-resources library passes the error response on to the rejection handler.
// It is therefore available in $asyncComputed.posts.exception
// <div v-else-if="$asyncComputed.posts.error"> Error while loading posts: $asyncComputed.posts.exception.statusText </div>
````

## Global error handling

By default, in case of a rejected promise in an async computed property, vue-async-computed will take care of logging the error for you.

If you want to use a custom logging function, the plugin takes an `errorHandler`
option, which should be the function you want called with the error information.
By default, it will be called with only the error's stack trace as an argument,
but if you register the `errorHandler` with `useRawError` set to `true` the
function will receive the raw error, a reference to the `Vue` instance that
threw the error and the error's stack trace.

For example:

```js
Vue.use(AsyncComputed, {
  errorHandler (stack) {
    console.log('Hey, an error!')
    console.log('---')
    console.log(stack)
  }
})

// Or with `useRawError`:
Vue.use(AsyncComputed, {
  useRawError: true,
  errorHandler (err, vm, stack) {
    console.log('An error occurred!')
    console.log('The error message was: ' + err.msg)
    console.log('And the stack trace was:')
    console.log(stack)
  }
})
```

You can pass `false` as the `errorHandler` in order to silently ignore rejected promises.

## License

MIT © [Benjamin Fox](https://github.com/foxbenjaminfox)
