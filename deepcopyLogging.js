// 处理原型，描述符，可扩展性，自定义扩展类，扩展数组类的Array.isArray判断，不可枚举属性，循环引用
// Array.isArray的返回值取决于对象构造时是否调用过Array()，不检查原型或者其他JS可访问属性，基于引擎内部数据结构检查，Object.create()和Array()在引擎内部创建的结构不同。
// 使用Object.create(prototype)不会调用对应的构造函数

// Map和Set的自定义扩展类需要先调用父类构造函数，再检查instanceof进行赋值，不能只检查Symbol.toStringTag就进行构建和赋值

// 函数拷贝问题比较多，大概也意义不大
// function对象的name属性可以复制，但它难以与新定义名或者变量名匹配。
// 内置函数看起来没办法拷贝。内置方法（非构造函数）以及简写定义的方法{func(){}}，的prototype属性是undefined。分析字符串可能是更好的办法（拿得到代码的话），不过没这么实现
// 闭包函数不能被处理，拿不到外部变量。原函数如果有绑定的this，新函数也拿不到。

// https://web.mit.edu/jwalden/www/isArray.html
// www.webatoms.in/blog/general/Difference-between-instanceOf-Array-and-Array-isArray-2f#contextId=0
// https://stackoverflow.com/questions/28222228/javascript-es6-test-for-arrow-function-built-in-function-regular-function
function deepCopy(origin, memo = new WeakMap()) {
  if (
    origin === null ||
    origin === void 0 ||
    (typeof origin !== "function" && typeof origin !== "object")
  ) {
    return origin;
  }
  if (memo.has(origin)) {
    return memo.get(origin);
  }
  return dealTypes(origin, memo);
}

function dealTypes(origin, memo) {
  let toTarget;
  if (classOf(origin) === "Function") {
    setToTarget(
      origin.prototype === void 0
        ? eval(origin.toString())
        : new Function(`return ${origin.toString()}`)()
    );

  } else {
    setToTarget(
      origin.constructor
        ? new origin.constructor()
        : Object.create(Object.getPrototypeOf(origin))                 // prototype may not exist
    );
  }

  if (toTarget instanceof Map) {
    for (const item of origin) {
      toTarget.set(item[0], dcCurry(item[1]));                          // item[0] might be a reference value, but shouldn't be copied.
    }
  } else if (toTarget instanceof Set) {
    for (const item of origin) {
      toTarget.add(dcCurry(item));
    }
  }

  for (const key of Reflect.ownKeys(origin)) {
    if (key==='prototype') { continue; }                                  // do not copy prototype of function object
    Object.defineProperty(toTarget, key, {                       // descriptors, non-enumerable values
      ...Object.getOwnPropertyDescriptor(origin, key),
      value: dcCurry(origin[key]),
    });
  }

  if (!Object.isExtensible(origin)) {
    // extensive
    Object.preventExtensions(toTarget);
  }

  return toTarget;

  function setToTarget(value) {
    toTarget = value;
    memo.set(origin, toTarget);
  }

  function dcCurry(value) {
    return deepCopy(value, memo);
  }
}

function classOf(o) {
  return Object.prototype.toString.call(o).slice(8, -1);
}

function loggingProxy(ob) {
  const handlers = {
    get(target, key, receiver) {
      console.log(`get ${key.toString()}`);
      const value = Reflect.get(target, key, receiver);
      if (
        Reflect.ownKeys(target).includes(key) &&
        (typeof value === "object" || typeof value === "function")
      ) {
        return loggingProxy(value);
      }
      return value;
    },
    set(target, key, value, receiver) {
      console.log(`set ${key.toString()} to be ${value}`);
      return Reflect.set(target, key, value, receiver);
    },
    apply(target, receiver, args) {
      console.log(`apply ${receiver} with ${args}`);
      return Reflect.apply(target, receiver, args);
    },
    construct(target, args, receiver) {
      console.log(`construct ${args.toString()}`);
      return Reflect.construct(target, args, receiver);
    },
  };
  Reflect.ownKeys(Reflect).forEach((func) => {
    if (!(func in handlers)) {
      handlers[func] = function (target, ...args) {
        console.log(`${func} ${args}`);
        return Reflect[func](target, ...args);
      };
    }
  });
  return new Proxy(ob, handlers);
}
