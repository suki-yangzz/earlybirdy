/* shared/storage/web.js —— H5 用 localStorage 适配器（失败时退回内存） */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.YYShared = root.YYShared || {};
    for (var k in api) if (Object.prototype.hasOwnProperty.call(api, k)) root.YYShared[k] = api[k];
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function createMemoryStorage() {
    var data = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); },
      removeItem: function (k) { delete data[k]; }
    };
  }

  function createWebStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        var probe = '__yy_probe__';
        localStorage.setItem(probe, '1');
        localStorage.removeItem(probe);
        return {
          getItem: function (k) { return localStorage.getItem(k); },
          setItem: function (k, v) { localStorage.setItem(k, v); },
          removeItem: function (k) { localStorage.removeItem(k); }
        };
      }
    } catch (err) { /* 隐私模式或 file:// 受限，退回内存 */ }
    return createMemoryStorage();
  }

  return { createWebStorage: createWebStorage, createMemoryStorage: createMemoryStorage };
});
