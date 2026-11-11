/* 轻量内联 SVG 图标库：无外部依赖，颜色继承 currentColor */
(function () {
  'use strict';
  window.YY = window.YY || {};

  var PATHS = {
    home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.8 20v-5.2h4.4V20"/>',
    tasks: '<circle cx="12" cy="12" r="8.6"/><path d="m8.2 12.2 2.4 2.4 5-5"/>',
    shop: '<path d="M4.2 9.2 5.6 4.5h12.8l1.4 4.7"/><path d="M5.4 9.2V19.5h13.2V9.2"/><path d="M9.7 19.5v-5.3h4.6v5.3"/>',
    user: '<circle cx="12" cy="8.4" r="3.4"/><path d="M5 19.6c.9-3.5 3.4-5.4 7-5.4s6.1 1.9 7 5.4"/>',
    music: '<path d="M9.4 17.4V5.8l9.2-1.7v11.6"/><circle cx="6.7" cy="17.8" r="2.7"/><circle cx="15.9" cy="15.7" r="2.7"/>',
    cards: '<rect x="7.2" y="5.2" width="12.6" height="14.6" rx="2.4"/><path d="M4.2 8.2v11.2c0 1.1.9 2 2 2h9.6"/>',
    video: '<circle cx="12" cy="12" r="8.8"/><path d="M10 8.6 15.8 12 10 15.4z"/>',
    play: '<path d="M8.4 5.4 18.6 12 8.4 18.6z"/>',
    pause: '<rect x="8" y="5.5" width="2.8" height="13" rx="1"/><rect x="13.2" y="5.5" width="2.8" height="13" rx="1"/>',
    skipBack: '<path d="M6.2 5.2v13.6"/><path d="M17.8 5.6v12.8L8.2 12z"/>',
    skipForward: '<path d="M17.8 5.2v13.6"/><path d="M6.2 5.6v12.8L15.8 12z"/>',
    rewind: '<path d="M11.4 6.2v11.6L3.6 12z"/><path d="M20.4 6.2v11.6L12.6 12z"/>',
    forward: '<path d="M3.6 6.2v11.6L11.4 12z"/><path d="M12.6 6.2v11.6L20.4 12z"/>',
    heart: '<path d="M12 20.2s-7.6-4.5-7.6-9.4c0-2.6 1.9-4.6 4.2-4.6 1.5 0 2.7.8 3.4 2 .7-1.2 1.9-2 3.4-2 2.3 0 4.2 2 4.2 4.6 0 4.9-7.6 9.4-7.6 9.4z"/>',
    moon: '<path d="M20.2 14.6A8.6 8.6 0 0 1 9.4 3.8 8.6 8.6 0 1 0 20.2 14.6z"/>',
    timer: '<circle cx="12" cy="13.4" r="7.4"/><path d="M12 9.8v3.9l2.4 1.6"/><path d="M9.5 3.2h5"/>',
    speaker: '<path d="M4.2 10.2h3.4L12 6.4v11.2l-4.4-3.8H4.2z"/><path d="M15.2 9.2a4 4 0 0 1 0 5.6"/><path d="M17.6 6.8a7.4 7.4 0 0 1 0 10.4"/>',
    arrowLeft: '<path d="M19 12H5.2"/><path d="m11 5.8-6.2 6.2 6.2 6.2"/>',
    arrowRight: '<path d="M5 12h13.8"/><path d="m13 5.8 6.2 6.2-6.2 6.2"/>',
    chevronRight: '<path d="m9.4 5.6 6.4 6.4-6.4 6.4"/>',
    chevronDown: '<path d="m5.6 9.4 6.4 6.4 6.4-6.4"/>',
    check: '<path d="m5.2 12.2 4.4 4.4 9.2-9.2"/>',
    checkCircle: '<circle cx="12" cy="12" r="8.6"/><path d="m8.2 12.2 2.4 2.4 5-5"/>',
    rotate: '<path d="M4.4 12a7.6 7.6 0 0 1 13-5.3L20 9"/><path d="M20 4.2V9h-4.8"/><path d="M19.6 12a7.6 7.6 0 0 1-13 5.3L4 15"/><path d="M4 19.8V15h4.8"/>',
    star: '<path d="m12 3.8 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8z"/>',
    flame: '<path d="M12.4 20c3.5 0 5.8-2.3 5.8-5.4 0-2.5-1.6-4-2.9-5.5-1-1.1-1.4-2.2-1.5-3.8-2 1.2-3.2 2.8-3.2 4.6-1.1-.5-1.8-1.4-2.1-2.6-1 1.4-1.8 3-1.8 4.9C6.7 17.5 9 20 12.4 20z"/>',
    cart: '<circle cx="9.4" cy="19" r="1.5"/><circle cx="17.4" cy="19" r="1.5"/><path d="M3.4 4.4h2.2l2.2 10.2h10.8l1.8-7.2H6.2"/>',
    plus: '<path d="M12 5.2v13.6"/><path d="M5.2 12h13.6"/>',
    minus: '<path d="M5.2 12h13.6"/>',
    x: '<path d="m6.2 6.2 11.6 11.6"/><path d="M17.8 6.2 6.2 17.8"/>',
    bookmark: '<path d="M6.4 4.4h11.2v16L12 16.8 6.4 20.4z"/>',
    gift: '<rect x="4" y="9.6" width="16" height="10.6" rx="1.6"/><path d="M3 6.6h18v3H3z"/><path d="M12 6.6v13.6"/><path d="M12 6.6C10.4 3.4 7 4 7.6 6.6"/><path d="M12 6.6c1.6-3.2 5-2.6 4.4 0"/>',
    info: '<circle cx="12" cy="12" r="8.8"/><path d="M12 11v5.2"/><circle cx="12" cy="7.8" r=".9" fill="currentColor" stroke="none"/>',
    calendar: '<rect x="4.2" y="5.6" width="15.6" height="14" rx="2.4"/><path d="M8 3.4v4M16 3.4v4M4.2 10.2h15.6"/>',
    eye: '<path d="M3.2 12S6.4 6 12 6s8.8 6 8.8 6-3.2 6-8.8 6S3.2 12 3.2 12z"/><circle cx="12" cy="12" r="2.6"/>',
    sparkle: '<path d="M12 3.6 13.7 9l5.4 1.7-5.4 1.7L12 17.8l-1.7-5.4L4.9 10.7 10.3 9z"/>',
    headphones: '<path d="M4.4 15v-2.6a7.6 7.6 0 0 1 15.2 0V15"/><rect x="4.4" y="13.6" width="3.6" height="6" rx="1.4"/><rect x="16" y="13.6" width="3.6" height="6" rx="1.4"/>',
    book: '<path d="M5 5.2h6.4c1 0 1.6.6 1.6 1.6v13c0-1-.7-1.6-1.6-1.6H5z"/><path d="M19 5.2h-6.4c-1 0-1.6.6-1.6 1.6v13c0-1 .7-1.6 1.6-1.6H19z"/>',
    flask: '<path d="M9.2 3.8h5.6M10.4 4v5.2L5.6 18.4c-.5 1 .2 2 1.3 2h10.2c1.1 0 1.8-1 1.3-2L13.6 9.2V4"/><path d="M7.6 14.6h8.8"/>',
    hand: '<path d="M8.4 11V5.8a1.4 1.4 0 0 1 2.8 0V10m0-4.6a1.4 1.4 0 0 1 2.8 0V10m0-4.2a1.4 1.4 0 0 1 2.8 0V13m0-6a1.4 1.4 0 0 1 2.8 0v6.2c0 4.2-2.5 7.4-6.4 7.4-2.5 0-4-1.2-5.3-3.4l-2.2-4a1.5 1.5 0 0 1 2.6-1.5l1.9 3.1"/>',
    image: '<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.4"/><circle cx="8.6" cy="9.4" r="1.6"/><path d="m4.6 17 5-5 3.6 3.6 3-2.6 4.2 4.4"/>',
    users: '<circle cx="9" cy="8.6" r="3.2"/><path d="M3.2 19.4c.8-3.2 3-5 5.8-5s5 1.8 5.8 5"/><path d="M15.4 5.9a3.2 3.2 0 0 1 0 5.4"/><path d="M17.2 14.8c1.8.6 3 2.3 3.6 4.6"/>',
    settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 3.6v2.2M12 18.2v2.2M3.6 12h2.2M18.2 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6"/>',
    trash: '<path d="M4.4 6.6h15.2"/><path d="M9 6.6V4.4h6v2.2"/><path d="M6.2 6.6 7 19.4c0 .6.5 1.2 1.2 1.2h7.6c.7 0 1.2-.6 1.2-1.2l.8-12.8"/><path d="M10 10.2v6.6M14 10.2v6.6"/>',
    bell: '<path d="M6.2 16.4V10.8a5.8 5.8 0 0 1 11.6 0v5.6l1.4 2H4.8z"/><path d="M10 19.8a2.2 2.2 0 0 0 4 0"/>',
    backpack: '<rect x="4.6" y="6.4" width="14.8" height="13.6" rx="3"/><path d="M8.4 6.4V5a2 2 0 0 1 2-2h3.2a2 2 0 0 1 2 2v1.4"/><path d="M4.6 12h14.8"/><path d="M9.4 15.4h5.2"/>',
    sparkles: '<path d="m9.6 3.6 1.2 3.6 3.6 1.2-3.6 1.2-1.2 3.6-1.2-3.6L4.8 8.4l3.6-1.2z"/><path d="m17.4 13.4.9 2.7 2.7.9-2.7.9-.9 2.7-.9-2.7-2.7-.9 2.7-.9z"/>'
  };

  function icon(name, size, cls) {
    var inner = PATHS[name];
    if (!inner) inner = PATHS.sparkle;
    var px = size || 22;
    return '<svg class="ic ' + (cls || '') + '" width="' + px + '" height="' + px + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      inner + '</svg>';
  }

  YY.icon = icon;
  YY.ICON_PATHS = PATHS;
})();
