[English](./README.md) | 简体中文

# Requex

基于axios封装的http组件, 自带nprogress进度条, 可自定义业务维度错误.

## 快速上手
```bash
# 安装
$ yarn add requex
```
```javascript
// 例子
import createInstance from 'requex';

// 和 axios.create() 相同的使用方法
const request = createInstance();
const response = await request({
    url:'/api/v1',
    method:'get',
})

// createInstance()第一个参数和axios.create()的参数相同.
const request = createInstance({
    withCredentials: true,
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
})

// createInstance()第二个参数使用如下
const request = createInstance({},{
    // isSucess用于对成功网络返回下的再次判断
    // 比如定义data.code是"200000"或者"200100"才是业务成功
    isSuccess: data => {
        const { code } = data;
        return ['200000', '200100'].includes(code);
    },
    // onSuccess为请求成功后的回调
    // 比如用某种UI库显示返回的文字
    onSuccess: data => {
        const { message } = data;
        Message.success(message);
    },
    // 和onSuccess相同, 是请求失败后的回调
    // 如果isSuccess(data) === false的时候, 200-300的返回码也会在onFail中出现
    onFail: (data, status, config) => {
        if(status === 401){
            // 对无权限返回做处理
        } else if(status >= 200 && status < 300) {
            // 对业务失败做处理
        } else {
            // 对其他失败做处理
        }
    }
})

// 额外参数
// extraData优先级低于axios.data, 此时发送{a:1:b:2}
const request = createInstance({})
const request = await request({
    url:'/api/v1',
    method:'POST',
    data: {a:1,b:2},
},{
    extraData: {c:1,d:2}
})

// 当不存在axios.data时, 发送{c:2,d:2}
const request = createInstance({})
const request = await request({
    url:'/api/v1',
    method:'POST',
},{
    extraData: {c:1,d:2}
})

// axios.data或extraData会在url模板拼接
// 此时请求url为'/api/v1/1/2', 发送{e:3}
// 注意被拼接的参数会从data中删除
const request = createInstance({})
const request = await request({
    url:'/api/v1/:c/:d',
    method:'POST',
},{
    extraData: {c:1,d:2,e:3}
})
```

## 参数文档
| 参数名 | 类型 | 说明 | 默认值 |
| ---   | --- | ---  | ---   |
| isSuccess | (data:any): boolean | 用于判断网络请求成功的接口(返回码在200-300之间),是否是业务成功 | () => true
| beforeRequest | (requestId:number): void | 在请求开始前的回调, 可用于对接UI库开启loading特效 | () => {}
| afterRequest | (requestId:number): void | 在请求结束后的回调, 可用于对接UI库关闭loading特效 | () => {}
| onSuccess | (data: any, status: number, config: AxiosRequestConfig): void | 在请求成功时的回调, 可用于对接UI库弹出成功文本等 | () => {}
| onFail | (data: any, status: number, config: AxiosRequestConfig): void | 在请求失败时的回调, 可用于处理各种错误码, 对接UI库弹出失败文本等 | () => {}
| confirmText | string | 当后台返回为新页面时, 弹出提示框的文本 | 'Jump to the target page?' 
| extraData | object | 相当于axios.data, 优先级低于axios.data | {}
| showSpin | boolean | 是否显示loading动效 | true
| getContainer | (): HTMLElement | loading动效绑定的组件 | () => document.getElementById('root')