'use strict';

var _require = require('redux'),
    bindActionCreators = _require.bindActionCreators;

module.exports = function wrapActionCreators(actionCreators) {
  return function (dispatch) {
    return bindActionCreators(actionCreators, dispatch);
  };
};
//# sourceMappingURL=wrapActionCreators.js.map