[简体中文](./README_zh-CN.md) | English

# Requex

A HTTP component based on [axios](https://github.com/axios/axios), with loading spinner based on [NProgress](https://github.com/rstacruz/nprogress). Could be used to customize error on business level and simplify the HTTP request flow in your project.

## Getting Started
```bash
# Install
$ yarn add requex
```
```javascript
// Examples
import createInstance from 'requex';

// [createInstance] used to create a request instance.
// The parameters are separated into [axios configs] and [request options]
// The first parameter is the [axios config] which is  used to configure the global axios features same as axios.create()
const request = createInstance({
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// The second parameter is the [request options] which is used to configure the global request features.
const request = createInstance(
  {
    // Some kinds of the response should be defined as error even it's network response code is between 200 and 300. [isSuccess] is the certain parameter to defined the response pattern.
    // e.g. Only response which data.code equal to '200000' or '200100' could be treated as successful.
    isSuccess: data => {
      const { code } = data;
      return ['200000', '200100'].includes(code);
    },
  },
  {
    // The callback function on a success response.
    // Usually used to display a success message with a UI framework.
    onSuccess: data => {
      const { message } = data;
      Message.success(message);
    },
    // The callback function on a error response.
    // Status between 200 and 300 will also involved if this response is defined as error by [isSuccess].
    onFail: (data, status, config) => {
      if (status === 401) {
        // handle different kinds of network return code.
      } else if (status >= 200 && status < 300) {
      } else {
      }
    },
  },
);

// The [axios configs] and [request options] both could be overrided in request instance
const response = await request(
    {
    url: '/api/v1',
    method: 'POST',
    data: { a: 1, b: 2 },
    }, 
    {
        onSuccess: data => {
            const { message } = data;
            AnotherMessage.success(message);
        }
    },
);

// extraData is same as axios.data
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

// axios.data has higher priority than extraData.
// { a: 1, b: 2 } will be sended.
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

// axios.data and extraData will be used as url parameters when match the pattern ':param'.
// url will be '/api/v1/1/2' and data will be { e: 3 }
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
| Parameter | Type | Description | Default |
| ---   | --- | ---  | ---   |
| isSuccess | (data:any): boolean | a condition used to define a response as successful response. | () => true
| confirmText | string | the confirm text when return a new page. | 'Jump to the target page?' 
| showSpin | boolean | whether show the loading spinner. | true
| getContainer | (): HTMLElement | Parent node which the loading spinner should be rendered to. | () => document.getElementById('root')

## Request Options 
| Parameter | Type | Description | Default |
| ---   | --- | ---  | ---   |
| beforeRequest | (requestId:number): void | a callback function executed before a request. Usually used to open a loading spinner with an UI framework. | () => {}
| afterRequest | (requestId:number): void | a callback function executed after a request. Usually used to close a loading spinner with an UI framework. | () => {}
| onSuccess | (data: any, status: number, config: AxiosRequestConfig): void | a callback function executed on a successful response. Usually used to save response data or display a message with an UI framework. | () => {}
| onFail | (data: any, status: number, config: AxiosRequestConfig): void | a callback function executed on a error response. Usually used to do error handling or display message with an UI framework. | () => {}
| extraData | object | same as axios.data with lower priority. | {}