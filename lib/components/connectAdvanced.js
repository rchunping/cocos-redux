'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

var invariant = require('invariant');
var Subscription = require('../utils/Subscription');

var hotReloadingVersion = 0;
var dummyState = {};
function noop() {}
function makeSelectorStateful(sourceSelector, store) {
  // wrap the selector in an object that tracks its results between runs.
  var selector = {
    run: function runComponentSelector(props) {
      // console.log(props)
      try {
        var nextProps = sourceSelector(store.getState(), props);
        // console.log(nextProps)
        if (nextProps !== selector.props || selector.error) {
          selector.shouldComponentUpdate = true;
          selector.props = nextProps;
          selector.error = null;
        }
      } catch (error) {
        selector.shouldComponentUpdate = true;
        selector.error = error;
        console.log(error);
      }
    }
  };

  return selector;
}

module.exports.connectAdvanced = function (
/*
  selectorFactory is a func that is responsible for returning the selector function used to
  compute new props from state, props, and dispatch. For example:
     export default connectAdvanced((dispatch, options) => (state, props) => ({
      thing: state.things[props.thingId],
      saveThing: fields => dispatch(actionCreators.saveThing(props.thingId, fields)),
    }))(YourComponent)
   Access to dispatch is provided to the factory so selectorFactories can bind actionCreators
  outside of their selector as an optimization. Options passed to connectAdvanced are passed to
  the selectorFactory, along with displayName and wrappedObject, as the second argument.
   Note that selectorFactory is responsible for all caching/memoization of inbound and outbound
  props. Do not use connectAdvanced directly without memoizing results between calls to your
  selector, otherwise the Connect component will re-render on every state or props change.
*/

//  NEW: for cocos-redux
store, selectorFactory) {
  var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var _ref$getDisplayName = _ref.getDisplayName,
      getDisplayName = _ref$getDisplayName === undefined ? function (name) {
    return 'ConnectAdvanced(' + name + ')';
  } : _ref$getDisplayName,
      _ref$methodName = _ref.methodName,
      methodName = _ref$methodName === undefined ? 'connectAdvanced' : _ref$methodName,
      _ref$renderCountProp = _ref.renderCountProp,
      renderCountProp = _ref$renderCountProp === undefined ? undefined : _ref$renderCountProp,
      _ref$shouldHandleStat = _ref.shouldHandleStateChanges,
      shouldHandleStateChanges = _ref$shouldHandleStat === undefined ? true : _ref$shouldHandleStat,
      _ref$storeKey = _ref.storeKey,
      storeKey = _ref$storeKey === undefined ? 'store' : _ref$storeKey,
      _ref$withRef = _ref.withRef,
      withRef = _ref$withRef === undefined ? false : _ref$withRef,
      connectOptions = _objectWithoutProperties(_ref, ['getDisplayName', 'methodName', 'renderCountProp', 'shouldHandleStateChanges', 'storeKey', 'withRef']);

  var UPDATERKEY = '_updater';

  var subscriptionKey = storeKey + 'Subscription';
  var version = hotReloadingVersion++;

  return function wrapWithConnect(wrappedObject) {
    invariant((typeof wrappedObject === 'undefined' ? 'undefined' : _typeof(wrappedObject)) == 'object', 'You must pass a component to the function returned by ' + (methodName + '. Instead received ' + JSON.stringify(wrappedObject)));

    var wrappedObjectName = wrappedObject.properties.name || wrappedObject.name || 'prototypeObject';

    var displayName = getDisplayName(wrappedObjectName);

    var selectorFactoryOptions = _extends({}, connectOptions, {
      getDisplayName: getDisplayName,
      methodName: methodName,
      renderCountProp: renderCountProp,
      shouldHandleStateChanges: shouldHandleStateChanges,
      storeKey: storeKey,
      withRef: withRef,
      displayName: displayName,
      // wrappedObjectName,
      wrappedObject: wrappedObject
    });

    var connect = _extends({}, wrappedObject, {

      properties: _extends({}, wrappedObject.properties, {
        __version: "",
        __state: null,
        __renderCount: 0,
        __store: null,
        props: null,
        __selector: null,
        __subscription: null,
        __notifyNestedSubs: null
      }),

      onLoad: function onLoad() {
        if (wrappedObject.onLoad) wrappedObject.onLoad.call(this);
        this.__version = version;
        this.__state = {};
        this.__renderCount = 0;
        this.__store = store;

        // this.__setWrappedInstance = this.__setWrappedInstance.bind(this)

        invariant(this.__store, 'Could not find "' + storeKey + '" in either the context or props of ' + ('"' + displayName + '". Either wrap the root component in a <Provider>, ') + ('or explicitly pass "' + storeKey + '" as a prop to "' + displayName + '".'));

        this.__initSelector();
        this.__initSubscription();
      },

      start: function start() {
        if (shouldHandleStateChanges) {
          this.__subscription.trySubscribe();
          this.__selector.run(this.props);
          if (this.__selector.shouldComponentUpdate) {
            this.props = this.__selector.props;
            // this[UPDATERKEY]()
            // this.__selector.shouldComponentUpdate = false
          }
        }

        if (wrappedObject.start) wrappedObject.start.call(this);
      },

      onDestroy: function onDestroy() {
        if (wrappedObject.onDestroy) wrappedObject.onDestroy.call(this);
        if (this.__subscription) this.__subscription.tryUnsubscribe();
        this.__subscription = null;
        this.__notifyNestedSubs = noop;
        this.__store = null;
        this.props = null;
        this.__selector.run = noop;
        this.__selector.shouldComponentUpdate = false;
      },
      __initSelector: function __initSelector() {
        var sourceSelector = selectorFactory(store.dispatch, selectorFactoryOptions);
        this.__selector = makeSelectorStateful(sourceSelector, this.__store);
        this.__selector.run(this.props);
        this.props = this.__selector.props;
      },
      __initSubscription: function __initSubscription() {
        if (!shouldHandleStateChanges) return;

        // parentSub's source should match where store came from: props vs. context. A component
        // connected to the store via props shouldn't use subscription from context, or vice versa.
        // const parentSub = (this.propsMode ? this.props : this.context)[subscriptionKey]
        this.__subscription = new Subscription(this.__store, null, this.__onStateChange.bind(this));

        // `notifyNestedSubs` is duplicated to handle the case where the component is  unmounted in
        // the middle of the notification loop, where `this.subscription` will then be null. An
        // extra null check every change can be avoided by copying the method onto `this` and then
        // replacing it with a no-op on unmount. This can probably be avoided if Subscription's
        // listeners logic is changed to not call listeners that have been unsubscribed in the
        // middle of the notification loop.
        // this.__notifyNestedSubs = this.subscription.notifyNestedSubs.bind(this.__subscription)
      },
      __onStateChange: function __onStateChange() {
        var selector = this.__selector;
        selector.run(this.props);

        if (selector.error) {
          throw selector.error;
        }

        if (selector.shouldComponentUpdate) {
          this.props = this.__selector.props;
          // console.log(this.props)
          if (typeof this[UPDATERKEY] === 'function') {
            this[UPDATERKEY]();
          }
          selector.shouldComponentUpdate = false;
        }
      },
      __isSubscribed: function __isSubscribed() {
        return Boolean(this.__subscription) && this.__subscription.isSubscribed();
      }
    });
    return connect;
  };
};
//# sourceMappingURL=connectAdvanced.js.map