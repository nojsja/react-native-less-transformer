var less = require("less");
var semver = require("semver");
var path = require("path");
var appRoot = require("app-root-path");
var css2rn = require("css-to-react-native-transform").default;

var upstreamTransformer = null;
var mrnVersionMap = {
  1: 54,
  2: 60,
  3: 63
};

var reactNativeVersionString =
  require("@mrn/react-native/package.json").version;
var MReactNativeMinorVersion = semver.parse(reactNativeVersionString).major;
var reactNativeMinorVersion =
  mrnVersionMap[MReactNativeMinorVersion] || mrnVersionMap["3"];

if (reactNativeMinorVersion >= 59) {
  upstreamTransformer = require("metro-react-native-babel-transformer");
} else if (reactNativeMinorVersion >= 56) {
  upstreamTransformer = require("metro/src/reactNativeTransformer");
} else if (reactNativeMinorVersion >= 52) {
  upstreamTransformer = require("metro/src/transformer");
} else if (reactNativeMinorVersion >= 47) {
  upstreamTransformer = require("metro-bundler/src/transformer");
} else if (reactNativeMinorVersion === 46) {
  upstreamTransformer = require("metro-bundler/build/transformer");
} else {
  // handle RN <= 0.45
  var oldUpstreamTransformer = require("@mrn/react-native/packager/transformer");
  upstreamTransformer = {
    transform({ src, filename, options }) {
      return oldUpstreamTransformer.transform(src, filename, options);
    }
  };
}

function renderToCSS({ src, filename, options = {} }) {
  var { lessOptions = {} } = options;
  var lessPromise = new Promise((resolve, reject) => {
    less
      .render(src, { paths: [path.dirname(filename), appRoot], ...lessOptions })
      .then((result) => {
        resolve(result.css);
      })
      .catch(reject);
  });
  return lessPromise;
}

function renderCSSToReactNative(css) {
  return css2rn(css, { parseMediaQueries: true });
}

module.exports.transform = function (src, filename, options) {
  if (typeof src === "object") {
    // handle RN >= 0.46
    ({ src, filename, options } = src);
  }

  if (filename.endsWith(".less")) {
    return renderToCSS({ src, filename, options }).then((css) => {
      var cssObject = renderCSSToReactNative(css);
      return upstreamTransformer.transform({
        src: "module.exports = " + JSON.stringify(cssObject),
        filename,
        options
      });
    });
  }
  return upstreamTransformer.transform({ src, filename, options });
};

module.exports.renderToCSS = renderToCSS;
