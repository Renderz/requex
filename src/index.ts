import type { AxiosRequestConfig, AxiosInstance } from 'axios';
import axios from 'axios';
import { cloneDeep } from 'lodash';
import { parse, compile } from 'path-to-regexp';
import download from 'downloadjs';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

const style =
  'display: block;width: 100%;height: 100%;opacity: 0.4;filter: alpha(opacity=40);background: #FFF;position: fixed;top: 0;left: 0;z-index: 2000;';

const template =
  '<div class="bar" role="bar"><div class="peg"></div></div><div class="spinner" role="spinner" style="top: 50%;right: 50%"><div class="spinner-icon"></div></div>';

NProgress.configure({
  template,
});

interface ResponseCallbackFn<R> {
  (response: R, status: number, config: AxiosRequestConfig): void;
}

/**
 * 基于Axios拓展的“请求配置”
 * @param isSuccess  判断是否是业务成功
 * @param showSpin 是否显示"加载中"动态
 */
export interface Options<R extends unknown = any> extends AxiosRequestConfig {
  isSuccess?: (response: R) => boolean;
  showSpin?: boolean;
}

/**
 * 默认“请求配置”
 * @param getContainer 加载中组件挂载点
 */
export interface DefaultOptions<R> extends Options<R> {
  getContainer?: () => HTMLElement;
}

/**
 * “请求参数”
 * @param onSuccess 请求业务成功回调
 * @param onFail 请求失败回调
 * @param extraData 请求体参数 可以作为GET 的url params或 POST的data
 */
export type Params<R, D extends unknown = any> = {
  onSuccess?: ResponseCallbackFn<R>;
  // 请求失败回调
  onFail?: ResponseCallbackFn<R>;
  extraData?: D;
};

/**
 * 默认“请求参数”
 */
export type DefaultParams<R extends unknown = any> = Omit<Params<R>, 'extraData'>;

interface Result<R> {
  data: R;
  success: boolean;
  status: number;
}

function createInstance<R extends unknown = any>(
  defaultOptions: DefaultOptions<R>,
  defaultParams?: DefaultParams<R>,
  customizeInstance?: (instance: AxiosInstance) => void,
) {
  const requestIdList: number[] = [];
  let mask: HTMLElement;

  const instance = axios.create(defaultOptions);

  if (customizeInstance) {
    customizeInstance(instance);
  }

  return function request<TD extends unknown = any, TR extends unknown = R>(
    options: Options<TR & R>,
    params?: Params<TR & R, TD>,
  ): Promise<Result<TR & R>> {
    const {
      isSuccess = () => true,
      showSpin = true,
      getContainer = () => document.getElementById('root'),
    } = { ...defaultOptions, ...options };

    const {
      onSuccess = () => {},
      onFail = () => {},
      extraData = {},
    } = { ...defaultParams, ...params };
    // 1. check url contain pattern like '/:param1/:param2'.
    // 2. fill up the certain pattern with the param from data then delete them.
    // 3. idea from : https://github.com/zuiidea/antd-admin/blob/master/src/utils/request.js
    let { url = '' } = options;
    let domain = '';
    let tempData = options.data || extraData;
    const urlMatch = url.match(/[a-zA-z]+:\/\/[^/]*/);
    if (urlMatch) {
      [domain] = urlMatch;
      url = url.slice(domain.length);
    }
    const match = parse(url);
    url = compile(url)(tempData);
    // only replace pattern when matched
    if (match.length > 1) {
      const cloneData = cloneDeep(tempData);
      match.forEach((item) => {
        if (item instanceof Object && item.name in cloneData) {
          delete cloneData[item.name];
        }
      });
      tempData = cloneData;
    }
    url = domain + url;
    const mergedRequestOptions = { ...options, url };
    // extData can be used as [parmas] or [data] of request options depends on [method]
    if ([undefined, 'get', 'GET'].includes(options.method)) {
      mergedRequestOptions.params = tempData;
    } else {
      mergedRequestOptions.data = tempData;
    }
    // show spin and mask
    const container: HTMLElement = getContainer() || document.body;
    if (showSpin && requestIdList.length === 0) {
      NProgress.start();
      mask = document.createElement('div');
      mask.setAttribute('style', style);
      container.appendChild(mask);
    }
    // push a new request Id into requestList
    const requestId: number = Date.now();
    requestIdList.push(requestId);

    return instance(mergedRequestOptions)
      .then((response) => {
        const { data, status, headers } = response;
        const result: Result<TR & R> = { data, status, success: false };

        const isAttachment: boolean =
          (headers['content-disposition'] || '').indexOf('attachment') >= 0;
        const isNewHtml: boolean = (headers['content-type'] || '').indexOf('text/html') >= 0;

        if (isAttachment) {
          result.status = 200;
          result.success = true;
          const filename = decodeURIComponent(headers['content-disposition'].split('filename=')[1]);
          const contentType = headers['content-type'];
          download(data, filename, contentType);
          return result;
        }

        if (isNewHtml) {
          result.status = 302;
          result.success = false;
          return result;
        }

        const success = isSuccess(data);
        result.success = success;

        if (success) {
          onSuccess(data, status, mergedRequestOptions);
        } else {
          onFail(data, status, mergedRequestOptions);
        }

        return Promise.resolve(result);
      })
      .catch((error) => {
        const { response } = error;

        if (!response) {
          throw error;
        } else {
          const { data, status } = response;
          const result: Result<TR & R> = { data, status, success: false };

          onFail(data, status, mergedRequestOptions);

          return Promise.resolve(result);
        }
      })
      .finally(() => {
        requestIdList.splice(
          requestIdList.findIndex((v) => v === requestId),
          1,
        );
        if (requestIdList.length === 0 && mask !== undefined) {
          NProgress.done();
          container.removeChild(mask);
        }
      });
  };
}

export { AxiosRequestConfig } from 'axios';
export default createInstance;
