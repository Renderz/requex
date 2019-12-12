import axios, { AxiosRequestConfig } from 'axios';
import { cloneDeep } from 'lodash';
import { parse, compile } from 'path-to-regexp';
import download from 'downloadjs';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

const style =
  'display: block;width: 100%;height: 100%;opacity: 0.4;filter: alpha(opacity=40);background: #FFF;position: absolute;top: 0;left: 0;z-index: 2000;';

const template =
  '<div class="bar" role="bar"><div class="peg"></div></div><div class="spinner" role="spinner" style="top: 50%;right: 50%"><div class="spinner-icon"></div></div>';

NProgress.configure({
  template,
});

interface IsSuccessFunc {
  (data: any): boolean;
}

interface HandleRequestIdFunc {
  (requestId: number): void;
}

interface HandleResponseFunc {
  (data: any, status: number, config: AxiosRequestConfig): void;
}

interface GetContainerFunc {
  (): HTMLElement;
}

interface Options {
  isSuccess: IsSuccessFunc;
  beforeRequest: HandleRequestIdFunc;
  afterRequest: HandleRequestIdFunc;
  onSuccess: HandleResponseFunc;
  onFail: HandleResponseFunc;
  confirmText: string;
  extraData: any;
  showSpin: boolean;
  getContainer: GetContainerFunc;
}

interface Result {
  data: any;
  success: boolean;
  status: number;
}

function createInstance(axiosConfig: AxiosRequestConfig, defaultOptions: Options) {
  const requestIdList: number[] = [];
  const instance = axios.create(axiosConfig);

  return function request(requestConfig: AxiosRequestConfig, customerOptions: Options) {
    const {
      isSuccess = () => true,
      beforeRequest = () => { },
      afterRequest = () => { },
      onSuccess = () => { },
      onFail = () => { },
      confirmText = 'Jump to the target page?',
      extraData = {},
      showSpin = true,
      getContainer = () => document.getElementById('root'),
    } = { ...defaultOptions, ...customerOptions };

    // 1. check url contain pattern like '/:param1/:param2'.
    // 2. fill up the certain pattern with the param from data then delete them.
    // 3. idea from : https://github.com/zuiidea/antd-admin/blob/master/src/utils/request.js

    let { url = '' } = requestConfig;

    let domain = '';
    let tempData = requestConfig.data || extraData;
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
    // eslint-disable-next-line
    requestConfig.url = url;

    // extData can be used as [parmas] or [data] of request options depends on [method]
    if ([undefined, 'get', 'GET'].includes(requestConfig.method)) {
      // eslint-disable-next-line
      requestConfig.params = tempData;
    } else {
      // eslint-disable-next-line
      requestConfig.data = tempData;
    }

    // show spin and mask
    let mask: HTMLElement;
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

    return instance(requestConfig)
      .then(response => {
        const {
          data,
          status,
          headers,
          request: { responseURL },
        } = response;

        const result: Result = { data, status, success: false };

        const isAttachment: boolean =
          (headers['content-disposition'] || '').indexOf('attachment') >= 0;
        const isNewHtml: boolean = (headers['content-type'] || '').indexOf('text/html') >= 0;

        if (isAttachment) {
          const filename = headers['content-disposition'].split('filename=')[1];
          const contentType = headers['content-type'];

          download(data, filename, contentType);

          result.status = 200;
          result.success = true;
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
          onSuccess(data, status, requestConfig);
        } else {
          onFail(data, status, requestConfig);
        }

        return Promise.resolve(result);
      })
      .catch(error => {
        const { response } = error;

        if (!response) {
          throw error;
        } else {
          const { data, status } = response;
          const result: Result = { data, status, success: false };

          onFail(data, status, requestConfig);

          return Promise.resolve(result);
        }
      })
      .finally(() => {
        requestIdList.splice(
          requestIdList.findIndex(v => v === requestId),
          1,
        );

        if (showSpin && requestIdList.length === 0) {
          NProgress.done();
          container.removeChild(mask);
        }
        afterRequest(requestId);
      });
  };
}

export default createInstance;
