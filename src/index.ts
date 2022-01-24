import type { AxiosRequestConfig } from 'axios';
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

interface IsSuccessFunc<R> {
  (data: R): boolean;
}

interface HandleRequestIdFunc {
  (requestId: number): void;
}

interface HandleResponseFunc<R> {
  (data: R, status: number, config: AxiosRequestConfig): void;
}

interface GetContainerFunc {
  (): HTMLElement;
}

export interface Options<R extends object = any> extends AxiosRequestConfig {
  isSuccess?: IsSuccessFunc<R>;
  confirmText?: string;
  showSpin?: boolean;
  getContainer?: GetContainerFunc;
  blockDownload?: boolean;
}

export interface ExtraOptions<R extends object = any> {
  beforeRequest?: HandleRequestIdFunc;
  afterRequest?: HandleRequestIdFunc;
  onSuccess?: HandleResponseFunc<R>;
  onFail?: HandleResponseFunc<R>;
  extraData?: any;
}

interface Result<R> {
  data: R;
  success: boolean;
  status: number;
}

function createInstance<R extends object = any>(
  defaultOptions: Options<R>,
  defaultExtraOptions?: ExtraOptions<R>,
) {
  const requestIdList: number[] = [];
  let mask: HTMLElement;

  const instance = axios.create(defaultOptions);

  return function request<R extends object = any>(
    requestOptions: Options<R>,
    extraOptions?: ExtraOptions<R>,
  ): Promise<Result<R>> {
    const {
      isSuccess = () => true,
      confirmText = 'Jump to the target page?',
      showSpin = true,
      getContainer = () => document.getElementById('root'),
      blockDownload = false,
    } = { ...defaultOptions, ...requestOptions };

    const {
      beforeRequest = () => {},
      afterRequest = () => {},
      onSuccess = () => {},
      onFail = () => {},
      extraData = {},
    } = { ...defaultExtraOptions, ...extraOptions };

    // 1. check url contain pattern like '/:param1/:param2'.
    // 2. fill up the certain pattern with the param from data then delete them.
    // 3. idea from : https://github.com/zuiidea/antd-admin/blob/master/src/utils/request.js

    let { url = '' } = requestOptions;

    let domain = '';
    let tempData = requestOptions.data || extraData;

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

      match.forEach(item => {
        if (item instanceof Object && item.name in cloneData) {
          delete cloneData[item.name];
        }
      });

      tempData = cloneData;
    }

    url = domain + url;

    const mergedRequestOptions = { ...requestOptions, url };

    // extData can be used as [parmas] or [data] of request options depends on [method]
    if ([undefined, 'get', 'GET'].includes(requestOptions.method)) {
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
    beforeRequest(requestId);
    requestIdList.push(requestId);

    return instance(mergedRequestOptions)
      .then(response => {
        const {
          data,
          status,
          headers,
          request: { responseURL },
        } = response;

        const result: Result<R> = { data, status, success: false };

        const isAttachment: boolean =
          (headers['content-disposition'] || '').indexOf('attachment') >= 0;
        const isNewHtml: boolean = (headers['content-type'] || '').indexOf('text/html') >= 0;

        if (isAttachment) {
          result.status = 200;
          result.success = true;

          if (blockDownload) {
            return result;
          }

          const filename = decodeURIComponent(headers['content-disposition'].split('filename=')[1]);
          const contentType = headers['content-type'];

          download(data, filename, contentType);

          return result;
        }
        if (isNewHtml) {
          // eslint-disable-next-line
          if (window.confirm(confirmText)) {
            window.location = responseURL;
          }

          result.status = 302;
          result.success = false;
          return result;
        }

        const success = isSuccess(data);
        result.success = success;

        if (success) {
          onSuccess(data, status, requestOptions);
        } else {
          onFail(data, status, requestOptions);
        }

        return Promise.resolve(result);
      })
      .catch(error => {
        const { response } = error;

        if (!response) {
          throw error;
        } else {
          const { data, status } = response;
          const result: Result<R> = { data, status, success: false };

          onFail(data, status, requestOptions);

          return Promise.resolve(result);
        }
      })
      .finally(() => {
        requestIdList.splice(
          requestIdList.findIndex(v => v === requestId),
          1,
        );

        if (requestIdList.length === 0 && mask !== undefined) {
          NProgress.done();

          container.removeChild(mask);
        }
        afterRequest(requestId);
      });
  };
}

export { AxiosRequestConfig } from 'axios';
export default createInstance;
