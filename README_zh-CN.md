[English](./README.md) | 简体中文

# Requex

基于 [axios](https://github.com/axios/axios) 的 HTTP 组件,自带 [NProgress](https://github.com/rstacruz/nprogress) 请求中特效. 用于自定义业务级别错误, 简化请求流程.

## 快速上手

```bash
# 安装
$ yarn add requex
```

```typescript
// 使用示例
import createInstance from 'requex';

// [createInstance] 用于创建一个 axios 实例.
// [createInstance] 参数包括 [axios options] 和 [request params].

// 使用场景1，直接生成一个axios实例，参数和axios相同。
const request = createInstance({
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// 使用场景2，增加请求成功与失败回调。
const request = createInstance<{ message?: string; code?: string }>(
  {
    // 一些网络返回码在200-300之间的请求, 可能也需要被视为业务错误请求, [isBizSuccess] 正是用于定义这些返回类型.
    // 例如: 只有data.code 等于 '200100' 或者 '200000'的返回才被视为成功
    isBizSuccess: (response) => {
      const { code } = response;
      return code ? ['200000', '200100'].includes(code) : false;
    },
  },
  {
    // 请求成功的回调.
    onSuccess: (response) => {
      const { message } = response;
      Message.success(message);
    },
    // 请求失败的回调
    onFail: (response, status, config) => {
      // 用于对不同返回码进行错误处理.
      if (status === 401) {
        console.log('redirect', response);
      } else if (status >= 200 && status < 300) {
        console.log('error', response);
      } else {
        console.log('other', response);
      }
    },
  },
);

// [axios options] 和 [request params] 都可被request实例的私有参数重载.
const response = await request(
  {
    url: '/api/v1',
    method: 'POST',
    data: { a: 1, b: 2 },
  },
  {
    onSuccess: (response) => {
      const { message } = response;
      AnotherMessage.success(message);
    },
  },
);

// extraData 和axios.data相同.
const request = createInstance({});
const request = await request(
  {
    url: '/api/v1',
    method: 'POST',
  },
  {
    extraData: { c: 1, d: 2 },
  },
);

// axios.data 比 extraData具有更高的优先级.
// { a: 1, b: 2 } 将会被发送.
const request = createInstance({});
const request = await request(
  {
    url: '/api/v1',
    method: 'POST',
    data: { a: 1, b: 2 },
  },
  {
    extraData: { c: 1, d: 2 },
  },
);

// axios.data 和 extraData 都将被用于url的正则匹配.
// url会被匹配为'/api/v1/1/2'同时将发送{ e: 3 }.
const request = createInstance({});
const request = await request(
  {
    url: '/api/v1/:c/:d',
    method: 'POST',
  },
  {
    extraData: { c: 1, d: 2, e: 3 },
  },
);
```

## Request Options

| 参数 | 类型 | 说明 | 默认值 |
| --- | --- | --- | --- |
| isSuccess | (data:any): boolean | 用于定义业务成功的请求. | () => true |
| showSpin | boolean | 是否显示加载中特效. | true |
| getContainer | (): HTMLElement | 加载中特效挂载的组件. | () => document.getElementById('root') |

## Extra Request Options

| 参数 | 类型 | 说明 | 默认值 |
| --- | --- | --- | --- |
| onSuccess | (data: any, status: number, config: AxiosRequestConfig): void | 请求成功时的回调. | () => {} |
| onFail | (data: any, status: number, config: AxiosRequestConfig): void | 请求失败时的回调. | () => {} |
| extraData | object | 和 axios.data 相同, 但具有更低的优先级. | {} |
