'use strict';

var _require = require('./wrapMapToProps'),
    wrapMapToPropsConstant = _require.wrapMapToPropsConstant,
    wrapMapToPropsFunc = _require.wrapMapToPropsFunc;

function whenMapStateToPropsIsFunction(mapStateToProps) {
  return typeof mapStateToProps === 'function' ? wrapMapToPropsFunc(mapStateToProps, 'mapStateToProps') : undefined;
}

function whenMapStateToPropsIsMissing(mapStateToProps) {
  return !mapStateToProps ? wrapMapToPropsConstant(function () {
    return {};
  }) : undefined;
}

module.exports = [whenMapStateToPropsIsFunction, whenMapStateToPropsIsMissing];
//# sourceMappingURL=mapStateToProps.js.map