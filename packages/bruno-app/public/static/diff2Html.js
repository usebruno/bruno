!(function (e, t) {
  'object' == typeof exports && 'object' == typeof module
    ? (module.exports = t())
    : 'function' == typeof define && define.amd
    ? define('Diff2Html', [], t)
    : 'object' == typeof exports
    ? (exports.Diff2Html = t())
    : (e.Diff2Html = t());
})(this, () => {
  return (
    (e = {
      696: (e, t) => {
        'use strict';
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.convertChangesToDMP = function (e) {
            for (var t, n, i = [], r = 0; r < e.length; r++)
              (n = (t = e[r]).added ? 1 : t.removed ? -1 : 0), i.push([n, t.value]);
            return i;
          });
      },
      826: (e, t) => {
        'use strict';
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.convertChangesToXML = function (e) {
            for (var t = [], n = 0; n < e.length; n++) {
              var i = e[n];
              i.added ? t.push('<ins>') : i.removed && t.push('<del>'),
                t.push(
                  i.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
                ),
                i.added ? t.push('</ins>') : i.removed && t.push('</del>');
            }
            return t.join('');
          });
      },
      976: (e, t, n) => {
        'use strict';
        var i;
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.diffArrays = function (e, t, n) {
            return r.diff(e, t, n);
          }),
          (t.arrayDiff = void 0);
        var r = new ((i = n(913)) && i.__esModule ? i : { default: i }).default();
        (t.arrayDiff = r),
          (r.tokenize = function (e) {
            return e.slice();
          }),
          (r.join = r.removeEmpty =
            function (e) {
              return e;
            });
      },
      913: (e, t) => {
        'use strict';
        function n() {}
        function i(e, t, n, i, r) {
          for (var s = 0, o = t.length, a = 0, l = 0; s < o; s++) {
            var c = t[s];
            if (c.removed) {
              if (((c.value = e.join(i.slice(l, l + c.count))), (l += c.count), s && t[s - 1].added)) {
                var d = t[s - 1];
                (t[s - 1] = t[s]), (t[s] = d);
              }
            } else {
              if (!c.added && r) {
                var f = n.slice(a, a + c.count);
                (f = f.map(function (e, t) {
                  var n = i[l + t];
                  return n.length > e.length ? n : e;
                })),
                  (c.value = e.join(f));
              } else c.value = e.join(n.slice(a, a + c.count));
              (a += c.count), c.added || (l += c.count);
            }
          }
          var u = t[o - 1];
          return (
            o > 1 &&
              'string' == typeof u.value &&
              (u.added || u.removed) &&
              e.equals('', u.value) &&
              ((t[o - 2].value += u.value), t.pop()),
            t
          );
        }
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.default = n),
          (n.prototype = {
            diff: function (e, t) {
              var n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {},
                r = n.callback;
              'function' == typeof n && ((r = n), (n = {})), (this.options = n);
              var s = this;
              function o(e) {
                return r
                  ? (setTimeout(function () {
                      r(void 0, e);
                    }, 0),
                    !0)
                  : e;
              }
              (e = this.castInput(e)), (t = this.castInput(t)), (e = this.removeEmpty(this.tokenize(e)));
              var a = (t = this.removeEmpty(this.tokenize(t))).length,
                l = e.length,
                c = 1,
                d = a + l;
              n.maxEditLength && (d = Math.min(d, n.maxEditLength));
              var f = [{ newPos: -1, components: [] }],
                u = this.extractCommon(f[0], t, e, 0);
              if (f[0].newPos + 1 >= a && u + 1 >= l) return o([{ value: this.join(t), count: t.length }]);
              function h() {
                for (var n = -1 * c; n <= c; n += 2) {
                  var r = void 0,
                    d = f[n - 1],
                    u = f[n + 1],
                    h = (u ? u.newPos : 0) - n;
                  d && (f[n - 1] = void 0);
                  var p = d && d.newPos + 1 < a,
                    b = u && 0 <= h && h < l;
                  if (p || b) {
                    if (
                      (!p || (b && d.newPos < u.newPos)
                        ? ((r = { newPos: (g = u).newPos, components: g.components.slice(0) }),
                          s.pushComponent(r.components, void 0, !0))
                        : ((r = d).newPos++, s.pushComponent(r.components, !0, void 0)),
                      (h = s.extractCommon(r, t, e, n)),
                      r.newPos + 1 >= a && h + 1 >= l)
                    )
                      return o(i(s, r.components, t, e, s.useLongestToken));
                    f[n] = r;
                  } else f[n] = void 0;
                }
                var g;
                c++;
              }
              if (r)
                !(function e() {
                  setTimeout(function () {
                    if (c > d) return r();
                    h() || e();
                  }, 0);
                })();
              else
                for (; c <= d; ) {
                  var p = h();
                  if (p) return p;
                }
            },
            pushComponent: function (e, t, n) {
              var i = e[e.length - 1];
              i && i.added === t && i.removed === n
                ? (e[e.length - 1] = { count: i.count + 1, added: t, removed: n })
                : e.push({ count: 1, added: t, removed: n });
            },
            extractCommon: function (e, t, n, i) {
              for (
                var r = t.length, s = n.length, o = e.newPos, a = o - i, l = 0;
                o + 1 < r && a + 1 < s && this.equals(t[o + 1], n[a + 1]);

              )
                o++, a++, l++;
              return l && e.components.push({ count: l }), (e.newPos = o), a;
            },
            equals: function (e, t) {
              return this.options.comparator
                ? this.options.comparator(e, t)
                : e === t || (this.options.ignoreCase && e.toLowerCase() === t.toLowerCase());
            },
            removeEmpty: function (e) {
              for (var t = [], n = 0; n < e.length; n++) e[n] && t.push(e[n]);
              return t;
            },
            castInput: function (e) {
              return e;
            },
            tokenize: function (e) {
              return e.split('');
            },
            join: function (e) {
              return e.join('');
            }
          });
      },
      630: (e, t, n) => {
        'use strict';
        var i;
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.diffChars = function (e, t, n) {
            return r.diff(e, t, n);
          }),
          (t.characterDiff = void 0);
        var r = new ((i = n(913)) && i.__esModule ? i : { default: i }).default();
        t.characterDiff = r;
      },
      852: (e, t, n) => {
        'use strict';
        var i;
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.diffCss = function (e, t, n) {
            return r.diff(e, t, n);
          }),
          (t.cssDiff = void 0);
        var r = new ((i = n(913)) && i.__esModule ? i : { default: i }).default();
        (t.cssDiff = r),
          (r.tokenize = function (e) {
            return e.split(/([{}:;,]|\s+)/);
          });
      },
      276: (e, t, n) => {
        'use strict';
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.diffJson = function (e, t, n) {
            return l.diff(e, t, n);
          }),
          (t.canonicalize = c),
          (t.jsonDiff = void 0);
        var i,
          r = (i = n(913)) && i.__esModule ? i : { default: i },
          s = n(187);
        function o(e) {
          return (
            (o =
              'function' == typeof Symbol && 'symbol' == typeof Symbol.iterator
                ? function (e) {
                    return typeof e;
                  }
                : function (e) {
                    return e && 'function' == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype
                      ? 'symbol'
                      : typeof e;
                  }),
            o(e)
          );
        }
        var a = Object.prototype.toString,
          l = new r.default();
        function c(e, t, n, i, r) {
          var s, l;
          for (t = t || [], n = n || [], i && (e = i(r, e)), s = 0; s < t.length; s += 1) if (t[s] === e) return n[s];
          if ('[object Array]' === a.call(e)) {
            for (t.push(e), l = new Array(e.length), n.push(l), s = 0; s < e.length; s += 1) l[s] = c(e[s], t, n, i, r);
            return t.pop(), n.pop(), l;
          }
          if ((e && e.toJSON && (e = e.toJSON()), 'object' === o(e) && null !== e)) {
            t.push(e), (l = {}), n.push(l);
            var d,
              f = [];
            for (d in e) e.hasOwnProperty(d) && f.push(d);
            for (f.sort(), s = 0; s < f.length; s += 1) l[(d = f[s])] = c(e[d], t, n, i, d);
            t.pop(), n.pop();
          } else l = e;
          return l;
        }
        (t.jsonDiff = l),
          (l.useLongestToken = !0),
          (l.tokenize = s.lineDiff.tokenize),
          (l.castInput = function (e) {
            var t = this.options,
              n = t.undefinedReplacement,
              i = t.stringifyReplacer,
              r =
                void 0 === i
                  ? function (e, t) {
                      return void 0 === t ? n : t;
                    }
                  : i;
            return 'string' == typeof e ? e : JSON.stringify(c(e, null, null, r), r, '  ');
          }),
          (l.equals = function (e, t) {
            return r.default.prototype.equals.call(l, e.replace(/,([\r\n])/g, '$1'), t.replace(/,([\r\n])/g, '$1'));
          });
      },
      187: (e, t, n) => {
        'use strict';
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.diffLines = function (e, t, n) {
            return o.diff(e, t, n);
          }),
          (t.diffTrimmedLines = function (e, t, n) {
            var i = (0, s.generateOptions)(n, { ignoreWhitespace: !0 });
            return o.diff(e, t, i);
          }),
          (t.lineDiff = void 0);
        var i,
          r = (i = n(913)) && i.__esModule ? i : { default: i },
          s = n(9),
          o = new r.default();
        (t.lineDiff = o),
          (o.tokenize = function (e) {
            var t = [],
              n = e.split(/(\n|\r\n)/);
            n[n.length - 1] || n.pop();
            for (var i = 0; i < n.length; i++) {
              var r = n[i];
              i % 2 && !this.options.newlineIsToken
                ? (t[t.length - 1] += r)
                : (this.options.ignoreWhitespace && (r = r.trim()), t.push(r));
            }
            return t;
          });
      },
      146: (e, t, n) => {
        'use strict';
        var i;
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.diffSentences = function (e, t, n) {
            return r.diff(e, t, n);
          }),
          (t.sentenceDiff = void 0);
        var r = new ((i = n(913)) && i.__esModule ? i : { default: i }).default();
        (t.sentenceDiff = r),
          (r.tokenize = function (e) {
            return e.split(/(\S.+?[.!?])(?=\s+|$)/);
          });
      },
      303: (e, t, n) => {
        'use strict';
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.diffWords = function (e, t, n) {
            return (n = (0, s.generateOptions)(n, { ignoreWhitespace: !0 })), l.diff(e, t, n);
          }),
          (t.diffWordsWithSpace = function (e, t, n) {
            return l.diff(e, t, n);
          }),
          (t.wordDiff = void 0);
        var i,
          r = (i = n(913)) && i.__esModule ? i : { default: i },
          s = n(9),
          o = /^[A-Za-z\xC0-\u02C6\u02C8-\u02D7\u02DE-\u02FF\u1E00-\u1EFF]+$/,
          a = /\S/,
          l = new r.default();
        (t.wordDiff = l),
          (l.equals = function (e, t) {
            return (
              this.options.ignoreCase && ((e = e.toLowerCase()), (t = t.toLowerCase())),
              e === t || (this.options.ignoreWhitespace && !a.test(e) && !a.test(t))
            );
          }),
          (l.tokenize = function (e) {
            for (var t = e.split(/([^\S\r\n]+|[()[\]{}'"\r\n]|\b)/), n = 0; n < t.length - 1; n++)
              !t[n + 1] &&
                t[n + 2] &&
                o.test(t[n]) &&
                o.test(t[n + 2]) &&
                ((t[n] += t[n + 2]), t.splice(n + 1, 2), n--);
            return t;
          });
      },
      785: (e, t, n) => {
        'use strict';
        Object.defineProperty(t, '__esModule', { value: !0 }),
          Object.defineProperty(t, 'Diff', {
            enumerable: !0,
            get: function () {
              return r.default;
            }
          }),
          Object.defineProperty(t, 'diffChars', {
            enumerable: !0,
            get: function () {
              return s.diffChars;
            }
          }),
          Object.defineProperty(t, 'diffWords', {
            enumerable: !0,
            get: function () {
              return o.diffWords;
            }
          }),
          Object.defineProperty(t, 'diffWordsWithSpace', {
            enumerable: !0,
            get: function () {
              return o.diffWordsWithSpace;
            }
          }),
          Object.defineProperty(t, 'diffLines', {
            enumerable: !0,
            get: function () {
              return a.diffLines;
            }
          }),
          Object.defineProperty(t, 'diffTrimmedLines', {
            enumerable: !0,
            get: function () {
              return a.diffTrimmedLines;
            }
          }),
          Object.defineProperty(t, 'diffSentences', {
            enumerable: !0,
            get: function () {
              return l.diffSentences;
            }
          }),
          Object.defineProperty(t, 'diffCss', {
            enumerable: !0,
            get: function () {
              return c.diffCss;
            }
          }),
          Object.defineProperty(t, 'diffJson', {
            enumerable: !0,
            get: function () {
              return d.diffJson;
            }
          }),
          Object.defineProperty(t, 'canonicalize', {
            enumerable: !0,
            get: function () {
              return d.canonicalize;
            }
          }),
          Object.defineProperty(t, 'diffArrays', {
            enumerable: !0,
            get: function () {
              return f.diffArrays;
            }
          }),
          Object.defineProperty(t, 'applyPatch', {
            enumerable: !0,
            get: function () {
              return u.applyPatch;
            }
          }),
          Object.defineProperty(t, 'applyPatches', {
            enumerable: !0,
            get: function () {
              return u.applyPatches;
            }
          }),
          Object.defineProperty(t, 'parsePatch', {
            enumerable: !0,
            get: function () {
              return h.parsePatch;
            }
          }),
          Object.defineProperty(t, 'merge', {
            enumerable: !0,
            get: function () {
              return p.merge;
            }
          }),
          Object.defineProperty(t, 'structuredPatch', {
            enumerable: !0,
            get: function () {
              return b.structuredPatch;
            }
          }),
          Object.defineProperty(t, 'createTwoFilesPatch', {
            enumerable: !0,
            get: function () {
              return b.createTwoFilesPatch;
            }
          }),
          Object.defineProperty(t, 'createPatch', {
            enumerable: !0,
            get: function () {
              return b.createPatch;
            }
          }),
          Object.defineProperty(t, 'convertChangesToDMP', {
            enumerable: !0,
            get: function () {
              return g.convertChangesToDMP;
            }
          }),
          Object.defineProperty(t, 'convertChangesToXML', {
            enumerable: !0,
            get: function () {
              return m.convertChangesToXML;
            }
          });
        var i,
          r = (i = n(913)) && i.__esModule ? i : { default: i },
          s = n(630),
          o = n(303),
          a = n(187),
          l = n(146),
          c = n(852),
          d = n(276),
          f = n(976),
          u = n(690),
          h = n(719),
          p = n(51),
          b = n(286),
          g = n(696),
          m = n(826);
      },
      690: (e, t, n) => {
        'use strict';
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.applyPatch = o),
          (t.applyPatches = function (e, t) {
            'string' == typeof e && (e = (0, r.parsePatch)(e));
            var n = 0;
            !(function i() {
              var r = e[n++];
              if (!r) return t.complete();
              t.loadFile(r, function (e, n) {
                if (e) return t.complete(e);
                var s = o(n, r, t);
                t.patched(r, s, function (e) {
                  if (e) return t.complete(e);
                  i();
                });
              });
            })();
          });
        var i,
          r = n(719),
          s = (i = n(169)) && i.__esModule ? i : { default: i };
        function o(e, t) {
          var n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : {};
          if (('string' == typeof t && (t = (0, r.parsePatch)(t)), Array.isArray(t))) {
            if (t.length > 1) throw new Error('applyPatch only works with a single input.');
            t = t[0];
          }
          var i,
            o,
            a = e.split(/\r\n|[\n\v\f\r\x85]/),
            l = e.match(/\r\n|[\n\v\f\r\x85]/g) || [],
            c = t.hunks,
            d =
              n.compareLine ||
              function (e, t, n, i) {
                return t === i;
              },
            f = 0,
            u = n.fuzzFactor || 0,
            h = 0,
            p = 0;
          function b(e, t) {
            for (var n = 0; n < e.lines.length; n++) {
              var i = e.lines[n],
                r = i.length > 0 ? i[0] : ' ',
                s = i.length > 0 ? i.substr(1) : i;
              if (' ' === r || '-' === r) {
                if (!d(t + 1, a[t], r, s) && ++f > u) return !1;
                t++;
              }
            }
            return !0;
          }
          for (var g = 0; g < c.length; g++) {
            for (
              var m = c[g], v = a.length - m.oldLines, y = 0, w = p + m.oldStart - 1, S = (0, s.default)(w, h, v);
              void 0 !== y;
              y = S()
            )
              if (b(m, w + y)) {
                m.offset = p += y;
                break;
              }
            if (void 0 === y) return !1;
            h = m.offset + m.oldStart + m.oldLines;
          }
          for (var L = 0, C = 0; C < c.length; C++) {
            var x = c[C],
              O = x.oldStart + x.offset + L - 1;
            L += x.newLines - x.oldLines;
            for (var T = 0; T < x.lines.length; T++) {
              var j = x.lines[T],
                _ = j.length > 0 ? j[0] : ' ',
                N = j.length > 0 ? j.substr(1) : j,
                P = x.linedelimiters[T];
              if (' ' === _) O++;
              else if ('-' === _) a.splice(O, 1), l.splice(O, 1);
              else if ('+' === _) a.splice(O, 0, N), l.splice(O, 0, P), O++;
              else if ('\\' === _) {
                var E = x.lines[T - 1] ? x.lines[T - 1][0] : null;
                '+' === E ? (i = !0) : '-' === E && (o = !0);
              }
            }
          }
          if (i) for (; !a[a.length - 1]; ) a.pop(), l.pop();
          else o && (a.push(''), l.push('\n'));
          for (var M = 0; M < a.length - 1; M++) a[M] = a[M] + l[M];
          return a.join('');
        }
      },
      286: (e, t, n) => {
        'use strict';
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.structuredPatch = o),
          (t.formatPatch = a),
          (t.createTwoFilesPatch = l),
          (t.createPatch = function (e, t, n, i, r, s) {
            return l(e, e, t, n, i, r, s);
          });
        var i = n(187);
        function r(e) {
          return (
            (function (e) {
              if (Array.isArray(e)) return s(e);
            })(e) ||
            (function (e) {
              if ('undefined' != typeof Symbol && Symbol.iterator in Object(e)) return Array.from(e);
            })(e) ||
            (function (e, t) {
              if (e) {
                if ('string' == typeof e) return s(e, t);
                var n = Object.prototype.toString.call(e).slice(8, -1);
                return (
                  'Object' === n && e.constructor && (n = e.constructor.name),
                  'Map' === n || 'Set' === n
                    ? Array.from(e)
                    : 'Arguments' === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)
                    ? s(e, t)
                    : void 0
                );
              }
            })(e) ||
            (function () {
              throw new TypeError(
                'Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
              );
            })()
          );
        }
        function s(e, t) {
          (null == t || t > e.length) && (t = e.length);
          for (var n = 0, i = new Array(t); n < t; n++) i[n] = e[n];
          return i;
        }
        function o(e, t, n, s, o, a, l) {
          l || (l = {}), void 0 === l.context && (l.context = 4);
          var c = (0, i.diffLines)(n, s, l);
          if (c) {
            c.push({ value: '', lines: [] });
            for (
              var d = [],
                f = 0,
                u = 0,
                h = [],
                p = 1,
                b = 1,
                g = function (e) {
                  var t = c[e],
                    i = t.lines || t.value.replace(/\n$/, '').split('\n');
                  if (((t.lines = i), t.added || t.removed)) {
                    var o;
                    if (!f) {
                      var a = c[e - 1];
                      (f = p),
                        (u = b),
                        a &&
                          ((h = l.context > 0 ? v(a.lines.slice(-l.context)) : []), (f -= h.length), (u -= h.length));
                    }
                    (o = h).push.apply(
                      o,
                      r(
                        i.map(function (e) {
                          return (t.added ? '+' : '-') + e;
                        })
                      )
                    ),
                      t.added ? (b += i.length) : (p += i.length);
                  } else {
                    if (f)
                      if (i.length <= 2 * l.context && e < c.length - 2) {
                        var g;
                        (g = h).push.apply(g, r(v(i)));
                      } else {
                        var m,
                          y = Math.min(i.length, l.context);
                        (m = h).push.apply(m, r(v(i.slice(0, y))));
                        var w = { oldStart: f, oldLines: p - f + y, newStart: u, newLines: b - u + y, lines: h };
                        if (e >= c.length - 2 && i.length <= l.context) {
                          var S = /\n$/.test(n),
                            L = /\n$/.test(s),
                            C = 0 == i.length && h.length > w.oldLines;
                          !S && C && n.length > 0 && h.splice(w.oldLines, 0, '\\ No newline at end of file'),
                            ((S || C) && L) || h.push('\\ No newline at end of file');
                        }
                        d.push(w), (f = 0), (u = 0), (h = []);
                      }
                    (p += i.length), (b += i.length);
                  }
                },
                m = 0;
              m < c.length;
              m++
            )
              g(m);
            return { oldFileName: e, newFileName: t, oldHeader: o, newHeader: a, hunks: d };
          }
          function v(e) {
            return e.map(function (e) {
              return ' ' + e;
            });
          }
        }
        function a(e) {
          var t = [];
          e.oldFileName == e.newFileName && t.push('Index: ' + e.oldFileName),
            t.push('==================================================================='),
            t.push('--- ' + e.oldFileName + (void 0 === e.oldHeader ? '' : '\t' + e.oldHeader)),
            t.push('+++ ' + e.newFileName + (void 0 === e.newHeader ? '' : '\t' + e.newHeader));
          for (var n = 0; n < e.hunks.length; n++) {
            var i = e.hunks[n];
            0 === i.oldLines && (i.oldStart -= 1),
              0 === i.newLines && (i.newStart -= 1),
              t.push('@@ -' + i.oldStart + ',' + i.oldLines + ' +' + i.newStart + ',' + i.newLines + ' @@'),
              t.push.apply(t, i.lines);
          }
          return t.join('\n') + '\n';
        }
        function l(e, t, n, i, r, s, l) {
          return a(o(e, t, n, i, r, s, l));
        }
      },
      51: (e, t, n) => {
        'use strict';
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.calcLineCount = l),
          (t.merge = function (e, t, n) {
            (e = c(e, n)), (t = c(t, n));
            var i = {};
            (e.index || t.index) && (i.index = e.index || t.index),
              (e.newFileName || t.newFileName) &&
                (d(e)
                  ? d(t)
                    ? ((i.oldFileName = f(i, e.oldFileName, t.oldFileName)),
                      (i.newFileName = f(i, e.newFileName, t.newFileName)),
                      (i.oldHeader = f(i, e.oldHeader, t.oldHeader)),
                      (i.newHeader = f(i, e.newHeader, t.newHeader)))
                    : ((i.oldFileName = e.oldFileName),
                      (i.newFileName = e.newFileName),
                      (i.oldHeader = e.oldHeader),
                      (i.newHeader = e.newHeader))
                  : ((i.oldFileName = t.oldFileName || e.oldFileName),
                    (i.newFileName = t.newFileName || e.newFileName),
                    (i.oldHeader = t.oldHeader || e.oldHeader),
                    (i.newHeader = t.newHeader || e.newHeader))),
              (i.hunks = []);
            for (var r = 0, s = 0, o = 0, a = 0; r < e.hunks.length || s < t.hunks.length; ) {
              var l = e.hunks[r] || { oldStart: 1 / 0 },
                b = t.hunks[s] || { oldStart: 1 / 0 };
              if (u(l, b)) i.hunks.push(h(l, o)), r++, (a += l.newLines - l.oldLines);
              else if (u(b, l)) i.hunks.push(h(b, a)), s++, (o += b.newLines - b.oldLines);
              else {
                var g = {
                  oldStart: Math.min(l.oldStart, b.oldStart),
                  oldLines: 0,
                  newStart: Math.min(l.newStart + o, b.oldStart + a),
                  newLines: 0,
                  lines: []
                };
                p(g, l.oldStart, l.lines, b.oldStart, b.lines), s++, r++, i.hunks.push(g);
              }
            }
            return i;
          });
        var i = n(286),
          r = n(719),
          s = n(780);
        function o(e) {
          return (
            (function (e) {
              if (Array.isArray(e)) return a(e);
            })(e) ||
            (function (e) {
              if ('undefined' != typeof Symbol && Symbol.iterator in Object(e)) return Array.from(e);
            })(e) ||
            (function (e, t) {
              if (e) {
                if ('string' == typeof e) return a(e, t);
                var n = Object.prototype.toString.call(e).slice(8, -1);
                return (
                  'Object' === n && e.constructor && (n = e.constructor.name),
                  'Map' === n || 'Set' === n
                    ? Array.from(e)
                    : 'Arguments' === n || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)
                    ? a(e, t)
                    : void 0
                );
              }
            })(e) ||
            (function () {
              throw new TypeError(
                'Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
              );
            })()
          );
        }
        function a(e, t) {
          (null == t || t > e.length) && (t = e.length);
          for (var n = 0, i = new Array(t); n < t; n++) i[n] = e[n];
          return i;
        }
        function l(e) {
          var t = C(e.lines),
            n = t.oldLines,
            i = t.newLines;
          void 0 !== n ? (e.oldLines = n) : delete e.oldLines, void 0 !== i ? (e.newLines = i) : delete e.newLines;
        }
        function c(e, t) {
          if ('string' == typeof e) {
            if (/^@@/m.test(e) || /^Index:/m.test(e)) return (0, r.parsePatch)(e)[0];
            if (!t) throw new Error('Must provide a base reference or pass in a patch');
            return (0, i.structuredPatch)(void 0, void 0, t, e);
          }
          return e;
        }
        function d(e) {
          return e.newFileName && e.newFileName !== e.oldFileName;
        }
        function f(e, t, n) {
          return t === n ? t : ((e.conflict = !0), { mine: t, theirs: n });
        }
        function u(e, t) {
          return e.oldStart < t.oldStart && e.oldStart + e.oldLines < t.oldStart;
        }
        function h(e, t) {
          return {
            oldStart: e.oldStart,
            oldLines: e.oldLines,
            newStart: e.newStart + t,
            newLines: e.newLines,
            lines: e.lines
          };
        }
        function p(e, t, n, i, r) {
          var s = { offset: t, lines: n, index: 0 },
            a = { offset: i, lines: r, index: 0 };
          for (v(e, s, a), v(e, a, s); s.index < s.lines.length && a.index < a.lines.length; ) {
            var c = s.lines[s.index],
              d = a.lines[a.index];
            if (('-' !== c[0] && '+' !== c[0]) || ('-' !== d[0] && '+' !== d[0]))
              if ('+' === c[0] && ' ' === d[0]) {
                var f;
                (f = e.lines).push.apply(f, o(w(s)));
              } else if ('+' === d[0] && ' ' === c[0]) {
                var u;
                (u = e.lines).push.apply(u, o(w(a)));
              } else
                '-' === c[0] && ' ' === d[0]
                  ? g(e, s, a)
                  : '-' === d[0] && ' ' === c[0]
                  ? g(e, a, s, !0)
                  : c === d
                  ? (e.lines.push(c), s.index++, a.index++)
                  : m(e, w(s), w(a));
            else b(e, s, a);
          }
          y(e, s), y(e, a), l(e);
        }
        function b(e, t, n) {
          var i = w(t),
            r = w(n);
          if (S(i) && S(r)) {
            var a, l;
            if ((0, s.arrayStartsWith)(i, r) && L(n, i, i.length - r.length))
              return void (a = e.lines).push.apply(a, o(i));
            if ((0, s.arrayStartsWith)(r, i) && L(t, r, r.length - i.length))
              return void (l = e.lines).push.apply(l, o(r));
          } else if ((0, s.arrayEqual)(i, r)) {
            var c;
            return void (c = e.lines).push.apply(c, o(i));
          }
          m(e, i, r);
        }
        function g(e, t, n, i) {
          var r,
            s = w(t),
            a = (function (e, t) {
              for (var n = [], i = [], r = 0, s = !1, o = !1; r < t.length && e.index < e.lines.length; ) {
                var a = e.lines[e.index],
                  l = t[r];
                if ('+' === l[0]) break;
                if (((s = s || ' ' !== a[0]), i.push(l), r++, '+' === a[0]))
                  for (o = !0; '+' === a[0]; ) n.push(a), (a = e.lines[++e.index]);
                l.substr(1) === a.substr(1) ? (n.push(a), e.index++) : (o = !0);
              }
              if (('+' === (t[r] || '')[0] && s && (o = !0), o)) return n;
              for (; r < t.length; ) i.push(t[r++]);
              return { merged: i, changes: n };
            })(n, s);
          a.merged ? (r = e.lines).push.apply(r, o(a.merged)) : m(e, i ? a : s, i ? s : a);
        }
        function m(e, t, n) {
          (e.conflict = !0), e.lines.push({ conflict: !0, mine: t, theirs: n });
        }
        function v(e, t, n) {
          for (; t.offset < n.offset && t.index < t.lines.length; ) {
            var i = t.lines[t.index++];
            e.lines.push(i), t.offset++;
          }
        }
        function y(e, t) {
          for (; t.index < t.lines.length; ) {
            var n = t.lines[t.index++];
            e.lines.push(n);
          }
        }
        function w(e) {
          for (var t = [], n = e.lines[e.index][0]; e.index < e.lines.length; ) {
            var i = e.lines[e.index];
            if (('-' === n && '+' === i[0] && (n = '+'), n !== i[0])) break;
            t.push(i), e.index++;
          }
          return t;
        }
        function S(e) {
          return e.reduce(function (e, t) {
            return e && '-' === t[0];
          }, !0);
        }
        function L(e, t, n) {
          for (var i = 0; i < n; i++) {
            var r = t[t.length - n + i].substr(1);
            if (e.lines[e.index + i] !== ' ' + r) return !1;
          }
          return (e.index += n), !0;
        }
        function C(e) {
          var t = 0,
            n = 0;
          return (
            e.forEach(function (e) {
              if ('string' != typeof e) {
                var i = C(e.mine),
                  r = C(e.theirs);
                void 0 !== t && (i.oldLines === r.oldLines ? (t += i.oldLines) : (t = void 0)),
                  void 0 !== n && (i.newLines === r.newLines ? (n += i.newLines) : (n = void 0));
              } else void 0 === n || ('+' !== e[0] && ' ' !== e[0]) || n++, void 0 === t || ('-' !== e[0] && ' ' !== e[0]) || t++;
            }),
            { oldLines: t, newLines: n }
          );
        }
      },
      719: (e, t) => {
        'use strict';
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.parsePatch = function (e) {
            var t = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
              n = e.split(/\r\n|[\n\v\f\r\x85]/),
              i = e.match(/\r\n|[\n\v\f\r\x85]/g) || [],
              r = [],
              s = 0;
            function o() {
              var e = {};
              for (r.push(e); s < n.length; ) {
                var i = n[s];
                if (/^(\-\-\-|\+\+\+|@@)\s/.test(i)) break;
                var o = /^(?:Index:|diff(?: -r \w+)+)\s+(.+?)\s*$/.exec(i);
                o && (e.index = o[1]), s++;
              }
              for (a(e), a(e), e.hunks = []; s < n.length; ) {
                var c = n[s];
                if (/^(Index:|diff|\-\-\-|\+\+\+)\s/.test(c)) break;
                if (/^@@/.test(c)) e.hunks.push(l());
                else {
                  if (c && t.strict) throw new Error('Unknown line ' + (s + 1) + ' ' + JSON.stringify(c));
                  s++;
                }
              }
            }
            function a(e) {
              var t = /^(---|\+\+\+)\s+(.*)$/.exec(n[s]);
              if (t) {
                var i = '---' === t[1] ? 'old' : 'new',
                  r = t[2].split('\t', 2),
                  o = r[0].replace(/\\\\/g, '\\');
                /^".*"$/.test(o) && (o = o.substr(1, o.length - 2)),
                  (e[i + 'FileName'] = o),
                  (e[i + 'Header'] = (r[1] || '').trim()),
                  s++;
              }
            }
            function l() {
              var e = s,
                r = n[s++].split(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/),
                o = {
                  oldStart: +r[1],
                  oldLines: void 0 === r[2] ? 1 : +r[2],
                  newStart: +r[3],
                  newLines: void 0 === r[4] ? 1 : +r[4],
                  lines: [],
                  linedelimiters: []
                };
              0 === o.oldLines && (o.oldStart += 1), 0 === o.newLines && (o.newStart += 1);
              for (
                var a = 0, l = 0;
                s < n.length &&
                !(
                  0 === n[s].indexOf('--- ') &&
                  s + 2 < n.length &&
                  0 === n[s + 1].indexOf('+++ ') &&
                  0 === n[s + 2].indexOf('@@')
                );
                s++
              ) {
                var c = 0 == n[s].length && s != n.length - 1 ? ' ' : n[s][0];
                if ('+' !== c && '-' !== c && ' ' !== c && '\\' !== c) break;
                o.lines.push(n[s]),
                  o.linedelimiters.push(i[s] || '\n'),
                  '+' === c ? a++ : '-' === c ? l++ : ' ' === c && (a++, l++);
              }
              if ((a || 1 !== o.newLines || (o.newLines = 0), l || 1 !== o.oldLines || (o.oldLines = 0), t.strict)) {
                if (a !== o.newLines) throw new Error('Added line count did not match for hunk at line ' + (e + 1));
                if (l !== o.oldLines) throw new Error('Removed line count did not match for hunk at line ' + (e + 1));
              }
              return o;
            }
            for (; s < n.length; ) o();
            return r;
          });
      },
      780: (e, t) => {
        'use strict';
        function n(e, t) {
          if (t.length > e.length) return !1;
          for (var n = 0; n < t.length; n++) if (t[n] !== e[n]) return !1;
          return !0;
        }
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.arrayEqual = function (e, t) {
            return e.length === t.length && n(e, t);
          }),
          (t.arrayStartsWith = n);
      },
      169: (e, t) => {
        'use strict';
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.default = function (e, t, n) {
            var i = !0,
              r = !1,
              s = !1,
              o = 1;
            return function a() {
              if (i && !s) {
                if ((r ? o++ : (i = !1), e + o <= n)) return o;
                s = !0;
              }
              if (!r) return s || (i = !0), t <= e - o ? -o++ : ((r = !0), a());
            };
          });
      },
      9: (e, t) => {
        'use strict';
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.generateOptions = function (e, t) {
            if ('function' == typeof e) t.callback = e;
            else if (e) for (var n in e) e.hasOwnProperty(n) && (t[n] = e[n]);
            return t;
          });
      },
      397: (e, t) => {
        !(function (e) {
          var t = /\S/,
            n = /\"/g,
            i = /\n/g,
            r = /\r/g,
            s = /\\/g,
            o = /\u2028/,
            a = /\u2029/;
          function l(e) {
            return e.trim ? e.trim() : e.replace(/^\s*|\s*$/g, '');
          }
          function c(e, t, n) {
            if (t.charAt(n) != e.charAt(0)) return !1;
            for (var i = 1, r = e.length; i < r; i++) if (t.charAt(n + i) != e.charAt(i)) return !1;
            return !0;
          }
          (e.tags = { '#': 1, '^': 2, '<': 3, $: 4, '/': 5, '!': 6, '>': 7, '=': 8, _v: 9, '{': 10, '&': 11, _t: 12 }),
            (e.scan = function (n, i) {
              var r,
                s = n.length,
                o = 0,
                a = null,
                d = null,
                f = '',
                u = [],
                h = !1,
                p = 0,
                b = 0,
                g = '{{',
                m = '}}';
              function v() {
                f.length > 0 && (u.push({ tag: '_t', text: new String(f) }), (f = ''));
              }
              function y(n, i) {
                if (
                  (v(),
                  n &&
                    (function () {
                      for (var n = !0, i = b; i < u.length; i++)
                        if (!(n = e.tags[u[i].tag] < e.tags._v || ('_t' == u[i].tag && null === u[i].text.match(t))))
                          return !1;
                      return n;
                    })())
                )
                  for (var r, s = b; s < u.length; s++)
                    u[s].text && ((r = u[s + 1]) && '>' == r.tag && (r.indent = u[s].text.toString()), u.splice(s, 1));
                else i || u.push({ tag: '\n' });
                (h = !1), (b = u.length);
              }
              function w(e, t) {
                var n = '=' + m,
                  i = e.indexOf(n, t),
                  r = l(e.substring(e.indexOf('=', t) + 1, i)).split(' ');
                return (g = r[0]), (m = r[r.length - 1]), i + n.length - 1;
              }
              for (i && ((i = i.split(' ')), (g = i[0]), (m = i[1])), p = 0; p < s; p++)
                0 == o
                  ? c(g, n, p)
                    ? (--p, v(), (o = 1))
                    : '\n' == n.charAt(p)
                    ? y(h)
                    : (f += n.charAt(p))
                  : 1 == o
                  ? ((p += g.length - 1),
                    '=' == (a = (d = e.tags[n.charAt(p + 1)]) ? n.charAt(p + 1) : '_v')
                      ? ((p = w(n, p)), (o = 0))
                      : (d && p++, (o = 2)),
                    (h = p))
                  : c(m, n, p)
                  ? (u.push({ tag: a, n: l(f), otag: g, ctag: m, i: '/' == a ? h - g.length : p + m.length }),
                    (f = ''),
                    (p += m.length - 1),
                    (o = 0),
                    '{' == a &&
                      ('}}' == m
                        ? p++
                        : '}' === (r = u[u.length - 1]).n.substr(r.n.length - 1) &&
                          (r.n = r.n.substring(0, r.n.length - 1))))
                  : (f += n.charAt(p));
              return y(h, !0), u;
            });
          var d = { _t: !0, '\n': !0, $: !0, '/': !0 };
          function f(t, n, i, r) {
            var s,
              o = [],
              a = null,
              l = null;
            for (s = i[i.length - 1]; t.length > 0; ) {
              if (((l = t.shift()), s && '<' == s.tag && !(l.tag in d)))
                throw new Error('Illegal content in < super tag.');
              if (e.tags[l.tag] <= e.tags.$ || u(l, r)) i.push(l), (l.nodes = f(t, l.tag, i, r));
              else {
                if ('/' == l.tag) {
                  if (0 === i.length) throw new Error('Closing tag without opener: /' + l.n);
                  if (((a = i.pop()), l.n != a.n && !h(l.n, a.n, r)))
                    throw new Error('Nesting error: ' + a.n + ' vs. ' + l.n);
                  return (a.end = l.i), o;
                }
                '\n' == l.tag && (l.last = 0 == t.length || '\n' == t[0].tag);
              }
              o.push(l);
            }
            if (i.length > 0) throw new Error('missing closing tag: ' + i.pop().n);
            return o;
          }
          function u(e, t) {
            for (var n = 0, i = t.length; n < i; n++) if (t[n].o == e.n) return (e.tag = '#'), !0;
          }
          function h(e, t, n) {
            for (var i = 0, r = n.length; i < r; i++) if (n[i].c == e && n[i].o == t) return !0;
          }
          function p(e) {
            var t = [];
            for (var n in e.partials)
              t.push('"' + g(n) + '":{name:"' + g(e.partials[n].name) + '", ' + p(e.partials[n]) + '}');
            return (
              'partials: {' +
              t.join(',') +
              '}, subs: ' +
              (function (e) {
                var t = [];
                for (var n in e) t.push('"' + g(n) + '": function(c,p,t,i) {' + e[n] + '}');
                return '{ ' + t.join(',') + ' }';
              })(e.subs)
            );
          }
          e.stringify = function (t, n, i) {
            return '{code: function (c,p,i) { ' + e.wrapMain(t.code) + ' },' + p(t) + '}';
          };
          var b = 0;
          function g(e) {
            return e
              .replace(s, '\\\\')
              .replace(n, '\\"')
              .replace(i, '\\n')
              .replace(r, '\\r')
              .replace(o, '\\u2028')
              .replace(a, '\\u2029');
          }
          function m(e) {
            return ~e.indexOf('.') ? 'd' : 'f';
          }
          function v(e, t) {
            var n = '<' + (t.prefix || '') + e.n + b++;
            return (
              (t.partials[n] = { name: e.n, partials: {} }),
              (t.code += 't.b(t.rp("' + g(n) + '",c,p,"' + (e.indent || '') + '"));'),
              n
            );
          }
          function y(e, t) {
            t.code += 't.b(t.t(t.' + m(e.n) + '("' + g(e.n) + '",c,p,0)));';
          }
          function w(e) {
            return 't.b(' + e + ');';
          }
          (e.generate = function (t, n, i) {
            b = 0;
            var r = { code: '', subs: {}, partials: {} };
            return e.walk(t, r), i.asString ? this.stringify(r, n, i) : this.makeTemplate(r, n, i);
          }),
            (e.wrapMain = function (e) {
              return 'var t=this;t.b(i=i||"");' + e + 'return t.fl();';
            }),
            (e.template = e.Template),
            (e.makeTemplate = function (e, t, n) {
              var i = this.makePartials(e);
              return (i.code = new Function('c', 'p', 'i', this.wrapMain(e.code))), new this.template(i, t, this, n);
            }),
            (e.makePartials = function (e) {
              var t,
                n = { subs: {}, partials: e.partials, name: e.name };
              for (t in n.partials) n.partials[t] = this.makePartials(n.partials[t]);
              for (t in e.subs) n.subs[t] = new Function('c', 'p', 't', 'i', e.subs[t]);
              return n;
            }),
            (e.codegen = {
              '#': function (t, n) {
                (n.code +=
                  'if(t.s(t.' +
                  m(t.n) +
                  '("' +
                  g(t.n) +
                  '",c,p,1),c,p,0,' +
                  t.i +
                  ',' +
                  t.end +
                  ',"' +
                  t.otag +
                  ' ' +
                  t.ctag +
                  '")){t.rs(c,p,function(c,p,t){'),
                  e.walk(t.nodes, n),
                  (n.code += '});c.pop();}');
              },
              '^': function (t, n) {
                (n.code += 'if(!t.s(t.' + m(t.n) + '("' + g(t.n) + '",c,p,1),c,p,1,0,0,"")){'),
                  e.walk(t.nodes, n),
                  (n.code += '};');
              },
              '>': v,
              '<': function (t, n) {
                var i = { partials: {}, code: '', subs: {}, inPartial: !0 };
                e.walk(t.nodes, i);
                var r = n.partials[v(t, n)];
                (r.subs = i.subs), (r.partials = i.partials);
              },
              $: function (t, n) {
                var i = { subs: {}, code: '', partials: n.partials, prefix: t.n };
                e.walk(t.nodes, i), (n.subs[t.n] = i.code), n.inPartial || (n.code += 't.sub("' + g(t.n) + '",c,p,i);');
              },
              '\n': function (e, t) {
                t.code += w('"\\n"' + (e.last ? '' : ' + i'));
              },
              _v: function (e, t) {
                t.code += 't.b(t.v(t.' + m(e.n) + '("' + g(e.n) + '",c,p,0)));';
              },
              _t: function (e, t) {
                t.code += w('"' + g(e.text) + '"');
              },
              '{': y,
              '&': y
            }),
            (e.walk = function (t, n) {
              for (var i, r = 0, s = t.length; r < s; r++) (i = e.codegen[t[r].tag]) && i(t[r], n);
              return n;
            }),
            (e.parse = function (e, t, n) {
              return f(e, 0, [], (n = n || {}).sectionTags || []);
            }),
            (e.cache = {}),
            (e.cacheKey = function (e, t) {
              return [e, !!t.asString, !!t.disableLambda, t.delimiters, !!t.modelGet].join('||');
            }),
            (e.compile = function (t, n) {
              n = n || {};
              var i = e.cacheKey(t, n),
                r = this.cache[i];
              if (r) {
                var s = r.partials;
                for (var o in s) delete s[o].instance;
                return r;
              }
              return (r = this.generate(this.parse(this.scan(t, n.delimiters), t, n), t, n)), (this.cache[i] = r);
            });
        })(t);
      },
      485: (e, t, n) => {
        var i = n(397);
        (i.Template = n(882).Template), (i.template = i.Template), (e.exports = i);
      },
      882: (e, t) => {
        !(function (e) {
          function t(e, t, n) {
            var i;
            return (
              t &&
                'object' == typeof t &&
                (void 0 !== t[e] ? (i = t[e]) : n && t.get && 'function' == typeof t.get && (i = t.get(e))),
              i
            );
          }
          (e.Template = function (e, t, n, i) {
            (e = e || {}),
              (this.r = e.code || this.r),
              (this.c = n),
              (this.options = i || {}),
              (this.text = t || ''),
              (this.partials = e.partials || {}),
              (this.subs = e.subs || {}),
              (this.buf = '');
          }),
            (e.Template.prototype = {
              r: function (e, t, n) {
                return '';
              },
              v: function (e) {
                return (
                  (e = l(e)),
                  a.test(e)
                    ? e
                        .replace(n, '&amp;')
                        .replace(i, '&lt;')
                        .replace(r, '&gt;')
                        .replace(s, '&#39;')
                        .replace(o, '&quot;')
                    : e
                );
              },
              t: l,
              render: function (e, t, n) {
                return this.ri([e], t || {}, n);
              },
              ri: function (e, t, n) {
                return this.r(e, t, n);
              },
              ep: function (e, t) {
                var n = this.partials[e],
                  i = t[n.name];
                if (n.instance && n.base == i) return n.instance;
                if ('string' == typeof i) {
                  if (!this.c) throw new Error('No compiler available.');
                  i = this.c.compile(i, this.options);
                }
                if (!i) return null;
                if (((this.partials[e].base = i), n.subs)) {
                  for (key in (t.stackText || (t.stackText = {}), n.subs))
                    t.stackText[key] ||
                      (t.stackText[key] =
                        void 0 !== this.activeSub && t.stackText[this.activeSub]
                          ? t.stackText[this.activeSub]
                          : this.text);
                  i = (function (e, t, n, i, r, s) {
                    function o() {}
                    function a() {}
                    var l;
                    (o.prototype = e), (a.prototype = e.subs);
                    var c = new o();
                    for (l in ((c.subs = new a()),
                    (c.subsText = {}),
                    (c.buf = ''),
                    (i = i || {}),
                    (c.stackSubs = i),
                    (c.subsText = s),
                    t))
                      i[l] || (i[l] = t[l]);
                    for (l in i) c.subs[l] = i[l];
                    for (l in ((r = r || {}), (c.stackPartials = r), n)) r[l] || (r[l] = n[l]);
                    for (l in r) c.partials[l] = r[l];
                    return c;
                  })(i, n.subs, n.partials, this.stackSubs, this.stackPartials, t.stackText);
                }
                return (this.partials[e].instance = i), i;
              },
              rp: function (e, t, n, i) {
                var r = this.ep(e, n);
                return r ? r.ri(t, n, i) : '';
              },
              rs: function (e, t, n) {
                var i = e[e.length - 1];
                if (c(i)) for (var r = 0; r < i.length; r++) e.push(i[r]), n(e, t, this), e.pop();
                else n(e, t, this);
              },
              s: function (e, t, n, i, r, s, o) {
                var a;
                return (
                  (!c(e) || 0 !== e.length) &&
                  ('function' == typeof e && (e = this.ms(e, t, n, i, r, s, o)),
                  (a = !!e),
                  !i && a && t && t.push('object' == typeof e ? e : t[t.length - 1]),
                  a)
                );
              },
              d: function (e, n, i, r) {
                var s,
                  o = e.split('.'),
                  a = this.f(o[0], n, i, r),
                  l = this.options.modelGet,
                  d = null;
                if ('.' === e && c(n[n.length - 2])) a = n[n.length - 1];
                else for (var f = 1; f < o.length; f++) void 0 !== (s = t(o[f], a, l)) ? ((d = a), (a = s)) : (a = '');
                return !(r && !a) && (r || 'function' != typeof a || (n.push(d), (a = this.mv(a, n, i)), n.pop()), a);
              },
              f: function (e, n, i, r) {
                for (var s = !1, o = !1, a = this.options.modelGet, l = n.length - 1; l >= 0; l--)
                  if (void 0 !== (s = t(e, n[l], a))) {
                    o = !0;
                    break;
                  }
                return o ? (r || 'function' != typeof s || (s = this.mv(s, n, i)), s) : !r && '';
              },
              ls: function (e, t, n, i, r) {
                var s = this.options.delimiters;
                return (
                  (this.options.delimiters = r),
                  this.b(this.ct(l(e.call(t, i)), t, n)),
                  (this.options.delimiters = s),
                  !1
                );
              },
              ct: function (e, t, n) {
                if (this.options.disableLambda) throw new Error('Lambda features disabled.');
                return this.c.compile(e, this.options).render(t, n);
              },
              b: function (e) {
                this.buf += e;
              },
              fl: function () {
                var e = this.buf;
                return (this.buf = ''), e;
              },
              ms: function (e, t, n, i, r, s, o) {
                var a,
                  l = t[t.length - 1],
                  c = e.call(l);
                return 'function' == typeof c
                  ? !!i ||
                      ((a =
                        this.activeSub && this.subsText && this.subsText[this.activeSub]
                          ? this.subsText[this.activeSub]
                          : this.text),
                      this.ls(c, l, n, a.substring(r, s), o))
                  : c;
              },
              mv: function (e, t, n) {
                var i = t[t.length - 1],
                  r = e.call(i);
                return 'function' == typeof r ? this.ct(l(r.call(i)), i, n) : r;
              },
              sub: function (e, t, n, i) {
                var r = this.subs[e];
                r && ((this.activeSub = e), r(t, n, this, i), (this.activeSub = !1));
              }
            });
          var n = /&/g,
            i = /</g,
            r = />/g,
            s = /\'/g,
            o = /\"/g,
            a = /[&<>\"\']/;
          function l(e) {
            return String(null == e ? '' : e);
          }
          var c =
            Array.isArray ||
            function (e) {
              return '[object Array]' === Object.prototype.toString.call(e);
            };
        })(t);
      },
      468: (e, t, n) => {
        'use strict';
        Object.defineProperty(t, '__esModule', { value: !0 }), (t.parse = void 0);
        const i = n(699),
          r = n(593);
        function s(e, t) {
          const n = e.split('.');
          return n.length > 1 ? n[n.length - 1] : t;
        }
        function o(e, t) {
          return t.reduce((t, n) => t || e.startsWith(n), !1);
        }
        const a = ['a/', 'b/', 'i/', 'w/', 'c/', 'o/'];
        function l(e, t, n) {
          const i = void 0 !== n ? [...a, n] : a,
            s = t ? new RegExp(`^${(0, r.escapeForRegExp)(t)} "?(.+?)"?$`) : new RegExp('^"?(.+?)"?$'),
            [, o = ''] = s.exec(e) || [],
            l = i.find((e) => 0 === o.indexOf(e));
          return (l ? o.slice(l.length) : o).replace(
            /\s+\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)? [+-]\d{4}.*$/,
            ''
          );
        }
        t.parse = function (e, t = {}) {
          const n = [];
          let r = null,
            a = null,
            c = null,
            d = null,
            f = null,
            u = null,
            h = null;
          const p = '--- ',
            b = '+++ ',
            g = '@@',
            m = /^old mode (\d{6})/,
            v = /^new mode (\d{6})/,
            y = /^deleted file mode (\d{6})/,
            w = /^new file mode (\d{6})/,
            S = /^copy from "?(.+)"?/,
            L = /^copy to "?(.+)"?/,
            C = /^rename from "?(.+)"?/,
            x = /^rename to "?(.+)"?/,
            O = /^similarity index (\d+)%/,
            T = /^dissimilarity index (\d+)%/,
            j = /^index ([\da-z]+)\.\.([\da-z]+)\s*(\d{6})?/,
            _ = /^Binary files (.*) and (.*) differ/,
            N = /^GIT binary patch/,
            P = /^index ([\da-z]+),([\da-z]+)\.\.([\da-z]+)/,
            E = /^mode (\d{6}),(\d{6})\.\.(\d{6})/,
            M = /^new file mode (\d{6})/,
            H = /^deleted file mode (\d{6}),(\d{6})/,
            k = e
              .replace(/\\ No newline at end of file/g, '')
              .replace(/\r\n?/g, '\n')
              .split('\n');
          function D() {
            null !== a && null !== r && (r.blocks.push(a), (a = null));
          }
          function F() {
            null !== r &&
              (r.oldName || null === u || (r.oldName = u),
              r.newName || null === h || (r.newName = h),
              r.newName && (n.push(r), (r = null))),
              (u = null),
              (h = null);
          }
          function I() {
            D(), F(), (r = { blocks: [], deletedLines: 0, addedLines: 0 });
          }
          function A(e) {
            let t;
            D(),
              null !== r &&
                ((t = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@.*/.exec(e))
                  ? ((r.isCombined = !1), (c = parseInt(t[1], 10)), (f = parseInt(t[2], 10)))
                  : (t = /^@@@ -(\d+)(?:,\d+)? -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@@.*/.exec(e))
                  ? ((r.isCombined = !0), (c = parseInt(t[1], 10)), (d = parseInt(t[2], 10)), (f = parseInt(t[3], 10)))
                  : (e.startsWith(g) && console.error('Failed to parse lines, starting in 0!'),
                    (c = 0),
                    (f = 0),
                    (r.isCombined = !1))),
              (a = { lines: [], oldStartLine: c, oldStartLine2: d, newStartLine: f, header: e });
          }
          return (
            k.forEach((e, d) => {
              if (!e || e.startsWith('*')) return;
              let D;
              const F = k[d - 1],
                R = k[d + 1],
                W = k[d + 2];
              if (e.startsWith('diff --git') || e.startsWith('diff --combined')) {
                if (
                  (I(),
                  (D = /^diff --git "?([a-ciow]\/.+)"? "?([a-ciow]\/.+)"?/.exec(e)) &&
                    ((u = l(D[1], void 0, t.dstPrefix)), (h = l(D[2], void 0, t.srcPrefix))),
                  null === r)
                )
                  throw new Error('Where is my file !!!');
                return void (r.isGitDiff = !0);
              }
              if (e.startsWith('Binary files') && !(null == r ? void 0 : r.isGitDiff)) {
                if (
                  (I(),
                  (D = /^Binary files "?([a-ciow]\/.+)"? and "?([a-ciow]\/.+)"? differ/.exec(e)) &&
                    ((u = l(D[1], void 0, t.dstPrefix)), (h = l(D[2], void 0, t.srcPrefix))),
                  null === r)
                )
                  throw new Error('Where is my file !!!');
                return void (r.isBinary = !0);
              }
              if (
                ((!r || (!r.isGitDiff && r && e.startsWith(p) && R.startsWith(b) && W.startsWith(g))) && I(),
                null == r ? void 0 : r.isTooBig)
              )
                return;
              if (
                r &&
                (('number' == typeof t.diffMaxChanges && r.addedLines + r.deletedLines > t.diffMaxChanges) ||
                  ('number' == typeof t.diffMaxLineLength && e.length > t.diffMaxLineLength))
              )
                return (
                  (r.isTooBig = !0),
                  (r.addedLines = 0),
                  (r.deletedLines = 0),
                  (r.blocks = []),
                  (a = null),
                  void A(
                    'function' == typeof t.diffTooBigMessage
                      ? t.diffTooBigMessage(n.length)
                      : 'Diff too big to be displayed'
                  )
                );
              if ((e.startsWith(p) && R.startsWith(b)) || (e.startsWith(b) && F.startsWith(p))) {
                if (
                  r &&
                  !r.oldName &&
                  e.startsWith('--- ') &&
                  (D = (function (e, t) {
                    return l(e, '---', t);
                  })(e, t.srcPrefix))
                )
                  return (r.oldName = D), void (r.language = s(r.oldName, r.language));
                if (
                  r &&
                  !r.newName &&
                  e.startsWith('+++ ') &&
                  (D = (function (e, t) {
                    return l(e, '+++', t);
                  })(e, t.dstPrefix))
                )
                  return (r.newName = D), void (r.language = s(r.newName, r.language));
              }
              if (r && (e.startsWith(g) || (r.isGitDiff && r.oldName && r.newName && !a))) return void A(e);
              if (a && (e.startsWith('+') || e.startsWith('-') || e.startsWith(' ')))
                return void (function (e) {
                  if (null === r || null === a || null === c || null === f) return;
                  const t = { content: e },
                    n = r.isCombined ? ['+ ', ' +', '++'] : ['+'],
                    s = r.isCombined ? ['- ', ' -', '--'] : ['-'];
                  o(e, n)
                    ? (r.addedLines++, (t.type = i.LineType.INSERT), (t.oldNumber = void 0), (t.newNumber = f++))
                    : o(e, s)
                    ? (r.deletedLines++, (t.type = i.LineType.DELETE), (t.oldNumber = c++), (t.newNumber = void 0))
                    : ((t.type = i.LineType.CONTEXT), (t.oldNumber = c++), (t.newNumber = f++)),
                    a.lines.push(t);
                })(e);
              const B = !(function (e, t) {
                let n = t;
                for (; n < k.length - 3; ) {
                  if (e.startsWith('diff')) return !1;
                  if (k[n].startsWith(p) && k[n + 1].startsWith(b) && k[n + 2].startsWith(g)) return !0;
                  n++;
                }
                return !1;
              })(e, d);
              if (null === r) throw new Error('Where is my file !!!');
              (D = m.exec(e))
                ? (r.oldMode = D[1])
                : (D = v.exec(e))
                ? (r.newMode = D[1])
                : (D = y.exec(e))
                ? ((r.deletedFileMode = D[1]), (r.isDeleted = !0))
                : (D = w.exec(e))
                ? ((r.newFileMode = D[1]), (r.isNew = !0))
                : (D = S.exec(e))
                ? (B && (r.oldName = D[1]), (r.isCopy = !0))
                : (D = L.exec(e))
                ? (B && (r.newName = D[1]), (r.isCopy = !0))
                : (D = C.exec(e))
                ? (B && (r.oldName = D[1]), (r.isRename = !0))
                : (D = x.exec(e))
                ? (B && (r.newName = D[1]), (r.isRename = !0))
                : (D = _.exec(e))
                ? ((r.isBinary = !0),
                  (r.oldName = l(D[1], void 0, t.srcPrefix)),
                  (r.newName = l(D[2], void 0, t.dstPrefix)),
                  A('Binary file'))
                : N.test(e)
                ? ((r.isBinary = !0), A(e))
                : (D = O.exec(e))
                ? (r.unchangedPercentage = parseInt(D[1], 10))
                : (D = T.exec(e))
                ? (r.changedPercentage = parseInt(D[1], 10))
                : (D = j.exec(e))
                ? ((r.checksumBefore = D[1]), (r.checksumAfter = D[2]), D[3] && (r.mode = D[3]))
                : (D = P.exec(e))
                ? ((r.checksumBefore = [D[2], D[3]]), (r.checksumAfter = D[1]))
                : (D = E.exec(e))
                ? ((r.oldMode = [D[2], D[3]]), (r.newMode = D[1]))
                : (D = M.exec(e))
                ? ((r.newFileMode = D[1]), (r.isNew = !0))
                : (D = H.exec(e)) && ((r.deletedFileMode = D[1]), (r.isDeleted = !0));
            }),
            D(),
            F(),
            n
          );
        };
      },
      979: function (e, t, n) {
        'use strict';
        var i =
            (this && this.__createBinding) ||
            (Object.create
              ? function (e, t, n, i) {
                  void 0 === i && (i = n);
                  var r = Object.getOwnPropertyDescriptor(t, n);
                  (r && !('get' in r ? !t.__esModule : r.writable || r.configurable)) ||
                    (r = {
                      enumerable: !0,
                      get: function () {
                        return t[n];
                      }
                    }),
                    Object.defineProperty(e, i, r);
                }
              : function (e, t, n, i) {
                  void 0 === i && (i = n), (e[i] = t[n]);
                }),
          r =
            (this && this.__setModuleDefault) ||
            (Object.create
              ? function (e, t) {
                  Object.defineProperty(e, 'default', { enumerable: !0, value: t });
                }
              : function (e, t) {
                  e.default = t;
                }),
          s =
            (this && this.__importStar) ||
            function (e) {
              if (e && e.__esModule) return e;
              var t = {};
              if (null != e)
                for (var n in e) 'default' !== n && Object.prototype.hasOwnProperty.call(e, n) && i(t, e, n);
              return r(t, e), t;
            };
        Object.defineProperty(t, '__esModule', { value: !0 }), (t.defaultTemplates = void 0);
        const o = s(n(485));
        (t.defaultTemplates = {}),
          (t.defaultTemplates['file-summary-line'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')),
                i.b('<li class="d2h-file-list-line">'),
                i.b('\n' + n),
                i.b('    <span class="d2h-file-name-wrapper">'),
                i.b('\n' + n),
                i.b(i.rp('<fileIcon0', e, t, '      ')),
                i.b('      <a href="#'),
                i.b(i.v(i.f('fileHtmlId', e, t, 0))),
                i.b('" class="d2h-file-name">'),
                i.b(i.v(i.f('fileName', e, t, 0))),
                i.b('</a>'),
                i.b('\n' + n),
                i.b('      <span class="d2h-file-stats">'),
                i.b('\n' + n),
                i.b('          <span class="d2h-lines-added">'),
                i.b(i.v(i.f('addedLines', e, t, 0))),
                i.b('</span>'),
                i.b('\n' + n),
                i.b('          <span class="d2h-lines-deleted">'),
                i.b(i.v(i.f('deletedLines', e, t, 0))),
                i.b('</span>'),
                i.b('\n' + n),
                i.b('      </span>'),
                i.b('\n' + n),
                i.b('    </span>'),
                i.b('\n' + n),
                i.b('</li>'),
                i.fl()
              );
            },
            partials: { '<fileIcon0': { name: 'fileIcon', partials: {}, subs: {} } },
            subs: {}
          })),
          (t.defaultTemplates['file-summary-wrapper'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')),
                i.b('<div class="d2h-file-list-wrapper '),
                i.b(i.v(i.f('colorScheme', e, t, 0))),
                i.b('">'),
                i.b('\n' + n),
                i.b('    <div class="d2h-file-list-header">'),
                i.b('\n' + n),
                i.b('        <span class="d2h-file-list-title">Files changed ('),
                i.b(i.v(i.f('filesNumber', e, t, 0))),
                i.b(')</span>'),
                i.b('\n' + n),
                i.b('        <a class="d2h-file-switch d2h-hide">hide</a>'),
                i.b('\n' + n),
                i.b('        <a class="d2h-file-switch d2h-show">show</a>'),
                i.b('\n' + n),
                i.b('    </div>'),
                i.b('\n' + n),
                i.b('    <ol class="d2h-file-list">'),
                i.b('\n' + n),
                i.b('    '),
                i.b(i.t(i.f('files', e, t, 0))),
                i.b('\n' + n),
                i.b('    </ol>'),
                i.b('\n' + n),
                i.b('</div>'),
                i.fl()
              );
            },
            partials: {},
            subs: {}
          })),
          (t.defaultTemplates['generic-block-header'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')),
                i.b('<tr>'),
                i.b('\n' + n),
                i.b('    <td class="'),
                i.b(i.v(i.f('lineClass', e, t, 0))),
                i.b(' '),
                i.b(i.v(i.d('CSSLineClass.INFO', e, t, 0))),
                i.b('"></td>'),
                i.b('\n' + n),
                i.b('    <td class="'),
                i.b(i.v(i.d('CSSLineClass.INFO', e, t, 0))),
                i.b('">'),
                i.b('\n' + n),
                i.b('        <div class="'),
                i.b(i.v(i.f('contentClass', e, t, 0))),
                i.b('">'),
                i.s(i.f('blockHeader', e, t, 1), e, t, 0, 156, 173, '{{ }}') &&
                  (i.rs(e, t, function (e, t, n) {
                    n.b(n.t(n.f('blockHeader', e, t, 0)));
                  }),
                  e.pop()),
                i.s(i.f('blockHeader', e, t, 1), e, t, 1, 0, 0, '') || i.b('&nbsp;'),
                i.b('</div>'),
                i.b('\n' + n),
                i.b('    </td>'),
                i.b('\n' + n),
                i.b('</tr>'),
                i.fl()
              );
            },
            partials: {},
            subs: {}
          })),
          (t.defaultTemplates['generic-empty-diff'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')),
                i.b('<tr>'),
                i.b('\n' + n),
                i.b('    <td class="'),
                i.b(i.v(i.d('CSSLineClass.INFO', e, t, 0))),
                i.b('">'),
                i.b('\n' + n),
                i.b('        <div class="'),
                i.b(i.v(i.f('contentClass', e, t, 0))),
                i.b('">'),
                i.b('\n' + n),
                i.b('            File without changes'),
                i.b('\n' + n),
                i.b('        </div>'),
                i.b('\n' + n),
                i.b('    </td>'),
                i.b('\n' + n),
                i.b('</tr>'),
                i.fl()
              );
            },
            partials: {},
            subs: {}
          })),
          (t.defaultTemplates['generic-file-path'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')),
                i.b('<span class="d2h-file-name-wrapper">'),
                i.b('\n' + n),
                i.b(i.rp('<fileIcon0', e, t, '    ')),
                i.b('    <span class="d2h-file-name">'),
                i.b(i.v(i.f('fileDiffName', e, t, 0))),
                i.b('</span>'),
                i.b('\n' + n),
                i.b(i.rp('<fileTag1', e, t, '    ')),
                i.b('</span>'),
                i.b('\n' + n),
                i.b('<label class="d2h-file-collapse">'),
                i.b('\n' + n),
                i.b('    <input class="d2h-file-collapse-input" type="checkbox" name="viewed" value="viewed">'),
                i.b('\n' + n),
                i.b('    Viewed'),
                i.b('\n' + n),
                i.b('</label>'),
                i.fl()
              );
            },
            partials: {
              '<fileIcon0': { name: 'fileIcon', partials: {}, subs: {} },
              '<fileTag1': { name: 'fileTag', partials: {}, subs: {} }
            },
            subs: {}
          })),
          (t.defaultTemplates['generic-line'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')),
                i.b('<tr>'),
                i.b('\n' + n),
                i.b('    <td class="'),
                i.b(i.v(i.f('lineClass', e, t, 0))),
                i.b(' '),
                i.b(i.v(i.f('type', e, t, 0))),
                i.b('">'),
                i.b('\n' + n),
                i.b('      '),
                i.b(i.t(i.f('lineNumber', e, t, 0))),
                i.b('\n' + n),
                i.b('    </td>'),
                i.b('\n' + n),
                i.b('    <td class="'),
                i.b(i.v(i.f('type', e, t, 0))),
                i.b('">'),
                i.b('\n' + n),
                i.b('        <div class="'),
                i.b(i.v(i.f('contentClass', e, t, 0))),
                i.b('">'),
                i.b('\n' + n),
                i.s(i.f('prefix', e, t, 1), e, t, 0, 162, 238, '{{ }}') &&
                  (i.rs(e, t, function (e, t, i) {
                    i.b('            <span class="d2h-code-line-prefix">'),
                      i.b(i.t(i.f('prefix', e, t, 0))),
                      i.b('</span>'),
                      i.b('\n' + n);
                  }),
                  e.pop()),
                i.s(i.f('prefix', e, t, 1), e, t, 1, 0, 0, '') ||
                  (i.b('            <span class="d2h-code-line-prefix">&nbsp;</span>'), i.b('\n' + n)),
                i.s(i.f('content', e, t, 1), e, t, 0, 371, 445, '{{ }}') &&
                  (i.rs(e, t, function (e, t, i) {
                    i.b('            <span class="d2h-code-line-ctn">'),
                      i.b(i.t(i.f('content', e, t, 0))),
                      i.b('</span>'),
                      i.b('\n' + n);
                  }),
                  e.pop()),
                i.s(i.f('content', e, t, 1), e, t, 1, 0, 0, '') ||
                  (i.b('            <span class="d2h-code-line-ctn"><br></span>'), i.b('\n' + n)),
                i.b('        </div>'),
                i.b('\n' + n),
                i.b('    </td>'),
                i.b('\n' + n),
                i.b('</tr>'),
                i.fl()
              );
            },
            partials: {},
            subs: {}
          })),
          (t.defaultTemplates['generic-wrapper'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')),
                i.b('<div class="d2h-wrapper '),
                i.b(i.v(i.f('colorScheme', e, t, 0))),
                i.b('">'),
                i.b('\n' + n),
                i.b('    '),
                i.b(i.t(i.f('content', e, t, 0))),
                i.b('\n' + n),
                i.b('</div>'),
                i.fl()
              );
            },
            partials: {},
            subs: {}
          })),
          (t.defaultTemplates['icon-file-added'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')),
                i.b(
                  '<svg aria-hidden="true" class="d2h-icon d2h-added" height="16" title="added" version="1.1" viewBox="0 0 14 16"'
                ),
                i.b('\n' + n),
                i.b('     width="14">'),
                i.b('\n' + n),
                i.b(
                  '    <path d="M13 1H1C0.45 1 0 1.45 0 2v12c0 0.55 0.45 1 1 1h12c0.55 0 1-0.45 1-1V2c0-0.55-0.45-1-1-1z m0 13H1V2h12v12zM6 9H3V7h3V4h2v3h3v2H8v3H6V9z"></path>'
                ),
                i.b('\n' + n),
                i.b('</svg>'),
                i.fl()
              );
            },
            partials: {},
            subs: {}
          })),
          (t.defaultTemplates['icon-file-changed'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')),
                i.b('<svg aria-hidden="true" class="d2h-icon d2h-changed" height="16" title="modified" version="1.1"'),
                i.b('\n' + n),
                i.b('     viewBox="0 0 14 16" width="14">'),
                i.b('\n' + n),
                i.b(
                  '    <path d="M13 1H1C0.45 1 0 1.45 0 2v12c0 0.55 0.45 1 1 1h12c0.55 0 1-0.45 1-1V2c0-0.55-0.45-1-1-1z m0 13H1V2h12v12zM4 8c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z"></path>'
                ),
                i.b('\n' + n),
                i.b('</svg>'),
                i.fl()
              );
            },
            partials: {},
            subs: {}
          })),
          (t.defaultTemplates['icon-file-deleted'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')),
                i.b('<svg aria-hidden="true" class="d2h-icon d2h-deleted" height="16" title="removed" version="1.1"'),
                i.b('\n' + n),
                i.b('     viewBox="0 0 14 16" width="14">'),
                i.b('\n' + n),
                i.b(
                  '    <path d="M13 1H1C0.45 1 0 1.45 0 2v12c0 0.55 0.45 1 1 1h12c0.55 0 1-0.45 1-1V2c0-0.55-0.45-1-1-1z m0 13H1V2h12v12zM11 9H3V7h8v2z"></path>'
                ),
                i.b('\n' + n),
                i.b('</svg>'),
                i.fl()
              );
            },
            partials: {},
            subs: {}
          })),
          (t.defaultTemplates['icon-file-renamed'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')),
                i.b('<svg aria-hidden="true" class="d2h-icon d2h-moved" height="16" title="renamed" version="1.1"'),
                i.b('\n' + n),
                i.b('     viewBox="0 0 14 16" width="14">'),
                i.b('\n' + n),
                i.b(
                  '    <path d="M6 9H3V7h3V4l5 4-5 4V9z m8-7v12c0 0.55-0.45 1-1 1H1c-0.55 0-1-0.45-1-1V2c0-0.55 0.45-1 1-1h12c0.55 0 1 0.45 1 1z m-1 0H1v12h12V2z"></path>'
                ),
                i.b('\n' + n),
                i.b('</svg>'),
                i.fl()
              );
            },
            partials: {},
            subs: {}
          })),
          (t.defaultTemplates['icon-file'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')),
                i.b(
                  '<svg aria-hidden="true" class="d2h-icon" height="16" version="1.1" viewBox="0 0 12 16" width="12">'
                ),
                i.b('\n' + n),
                i.b(
                  '    <path d="M6 5H2v-1h4v1zM2 8h7v-1H2v1z m0 2h7v-1H2v1z m0 2h7v-1H2v1z m10-7.5v9.5c0 0.55-0.45 1-1 1H1c-0.55 0-1-0.45-1-1V2c0-0.55 0.45-1 1-1h7.5l3.5 3.5z m-1 0.5L8 2H1v12h10V5z"></path>'
                ),
                i.b('\n' + n),
                i.b('</svg>'),
                i.fl()
              );
            },
            partials: {},
            subs: {}
          })),
          (t.defaultTemplates['line-by-line-file-diff'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')),
                i.b('<div id="'),
                i.b(i.v(i.f('fileHtmlId', e, t, 0))),
                i.b('" class="d2h-file-wrapper" data-lang="'),
                i.b(i.v(i.d('file.language', e, t, 0))),
                i.b('">'),
                i.b('\n' + n),
                i.b('    <div class="d2h-file-header">'),
                i.b('\n' + n),
                i.b('    '),
                i.b(i.t(i.f('filePath', e, t, 0))),
                i.b('\n' + n),
                i.b('    </div>'),
                i.b('\n' + n),
                i.b('    <div class="d2h-file-diff">'),
                i.b('\n' + n),
                i.b('        <div class="d2h-code-wrapper">'),
                i.b('\n' + n),
                i.b('            <table class="d2h-diff-table">'),
                i.b('\n' + n),
                i.b('                <tbody class="d2h-diff-tbody">'),
                i.b('\n' + n),
                i.b('                '),
                i.b(i.t(i.f('diffs', e, t, 0))),
                i.b('\n' + n),
                i.b('                </tbody>'),
                i.b('\n' + n),
                i.b('            </table>'),
                i.b('\n' + n),
                i.b('        </div>'),
                i.b('\n' + n),
                i.b('    </div>'),
                i.b('\n' + n),
                i.b('</div>'),
                i.fl()
              );
            },
            partials: {},
            subs: {}
          })),
          (t.defaultTemplates['line-by-line-numbers'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')),
                i.b('<div class="line-num1">'),
                i.b(i.v(i.f('oldNumber', e, t, 0))),
                i.b('</div>'),
                i.b('\n' + n),
                i.b('<div class="line-num2">'),
                i.b(i.v(i.f('newNumber', e, t, 0))),
                i.b('</div>'),
                i.fl()
              );
            },
            partials: {},
            subs: {}
          })),
          (t.defaultTemplates['side-by-side-file-diff'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')),
                i.b('<div id="'),
                i.b(i.v(i.f('fileHtmlId', e, t, 0))),
                i.b('" class="d2h-file-wrapper" data-lang="'),
                i.b(i.v(i.d('file.language', e, t, 0))),
                i.b('">'),
                i.b('\n' + n),
                i.b('    <div class="d2h-file-header">'),
                i.b('\n' + n),
                i.b('      '),
                i.b(i.t(i.f('filePath', e, t, 0))),
                i.b('\n' + n),
                i.b('    </div>'),
                i.b('\n' + n),
                i.b('    <div class="d2h-files-diff">'),
                i.b('\n' + n),
                i.b('        <div class="d2h-file-side-diff">'),
                i.b('\n' + n),
                i.b('            <div class="d2h-code-wrapper">'),
                i.b('\n' + n),
                i.b('                <table class="d2h-diff-table">'),
                i.b('\n' + n),
                i.b('                    <tbody class="d2h-diff-tbody">'),
                i.b('\n' + n),
                i.b('                    '),
                i.b(i.t(i.d('diffs.left', e, t, 0))),
                i.b('\n' + n),
                i.b('                    </tbody>'),
                i.b('\n' + n),
                i.b('                </table>'),
                i.b('\n' + n),
                i.b('            </div>'),
                i.b('\n' + n),
                i.b('        </div>'),
                i.b('\n' + n),
                i.b('        <div class="d2h-file-side-diff">'),
                i.b('\n' + n),
                i.b('            <div class="d2h-code-wrapper">'),
                i.b('\n' + n),
                i.b('                <table class="d2h-diff-table">'),
                i.b('\n' + n),
                i.b('                    <tbody class="d2h-diff-tbody">'),
                i.b('\n' + n),
                i.b('                    '),
                i.b(i.t(i.d('diffs.right', e, t, 0))),
                i.b('\n' + n),
                i.b('                    </tbody>'),
                i.b('\n' + n),
                i.b('                </table>'),
                i.b('\n' + n),
                i.b('            </div>'),
                i.b('\n' + n),
                i.b('        </div>'),
                i.b('\n' + n),
                i.b('    </div>'),
                i.b('\n' + n),
                i.b('</div>'),
                i.fl()
              );
            },
            partials: {},
            subs: {}
          })),
          (t.defaultTemplates['tag-file-added'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return i.b((n = n || '')), i.b('<span class="d2h-tag d2h-added d2h-added-tag">ADDED</span>'), i.fl();
            },
            partials: {},
            subs: {}
          })),
          (t.defaultTemplates['tag-file-changed'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')), i.b('<span class="d2h-tag d2h-changed d2h-changed-tag">CHANGED</span>'), i.fl()
              );
            },
            partials: {},
            subs: {}
          })),
          (t.defaultTemplates['tag-file-deleted'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return (
                i.b((n = n || '')), i.b('<span class="d2h-tag d2h-deleted d2h-deleted-tag">DELETED</span>'), i.fl()
              );
            },
            partials: {},
            subs: {}
          })),
          (t.defaultTemplates['tag-file-renamed'] = new o.Template({
            code: function (e, t, n) {
              var i = this;
              return i.b((n = n || '')), i.b('<span class="d2h-tag d2h-moved d2h-moved-tag">RENAMED</span>'), i.fl();
            },
            partials: {},
            subs: {}
          }));
      },
      834: function (e, t, n) {
        'use strict';
        var i =
            (this && this.__createBinding) ||
            (Object.create
              ? function (e, t, n, i) {
                  void 0 === i && (i = n);
                  var r = Object.getOwnPropertyDescriptor(t, n);
                  (r && !('get' in r ? !t.__esModule : r.writable || r.configurable)) ||
                    (r = {
                      enumerable: !0,
                      get: function () {
                        return t[n];
                      }
                    }),
                    Object.defineProperty(e, i, r);
                }
              : function (e, t, n, i) {
                  void 0 === i && (i = n), (e[i] = t[n]);
                }),
          r =
            (this && this.__setModuleDefault) ||
            (Object.create
              ? function (e, t) {
                  Object.defineProperty(e, 'default', { enumerable: !0, value: t });
                }
              : function (e, t) {
                  e.default = t;
                }),
          s =
            (this && this.__importStar) ||
            function (e) {
              if (e && e.__esModule) return e;
              var t = {};
              if (null != e)
                for (var n in e) 'default' !== n && Object.prototype.hasOwnProperty.call(e, n) && i(t, e, n);
              return r(t, e), t;
            },
          o =
            (this && this.__importDefault) ||
            function (e) {
              return e && e.__esModule ? e : { default: e };
            };
        Object.defineProperty(t, '__esModule', { value: !0 }), (t.html = t.parse = t.defaultDiff2HtmlConfig = void 0);
        const a = s(n(468)),
          l = n(479),
          c = s(n(378)),
          d = s(n(170)),
          f = n(699),
          u = o(n(63));
        (t.defaultDiff2HtmlConfig = Object.assign(
          Object.assign(Object.assign({}, c.defaultLineByLineRendererConfig), d.defaultSideBySideRendererConfig),
          { outputFormat: f.OutputFormatType.LINE_BY_LINE, drawFileList: !0 }
        )),
          (t.parse = function (e, n = {}) {
            return a.parse(e, Object.assign(Object.assign({}, t.defaultDiff2HtmlConfig), n));
          }),
          (t.html = function (e, n = {}) {
            const i = Object.assign(Object.assign({}, t.defaultDiff2HtmlConfig), n),
              r = 'string' == typeof e ? a.parse(e, i) : e,
              s = new u.default(i),
              { colorScheme: o } = i,
              f = { colorScheme: o };
            return (
              (i.drawFileList ? new l.FileListRenderer(s, f).render(r) : '') +
              ('side-by-side' === i.outputFormat ? new d.default(s, i).render(r) : new c.default(s, i).render(r))
            );
          });
      },
      479: function (e, t, n) {
        'use strict';
        var i =
            (this && this.__createBinding) ||
            (Object.create
              ? function (e, t, n, i) {
                  void 0 === i && (i = n);
                  var r = Object.getOwnPropertyDescriptor(t, n);
                  (r && !('get' in r ? !t.__esModule : r.writable || r.configurable)) ||
                    (r = {
                      enumerable: !0,
                      get: function () {
                        return t[n];
                      }
                    }),
                    Object.defineProperty(e, i, r);
                }
              : function (e, t, n, i) {
                  void 0 === i && (i = n), (e[i] = t[n]);
                }),
          r =
            (this && this.__setModuleDefault) ||
            (Object.create
              ? function (e, t) {
                  Object.defineProperty(e, 'default', { enumerable: !0, value: t });
                }
              : function (e, t) {
                  e.default = t;
                }),
          s =
            (this && this.__importStar) ||
            function (e) {
              if (e && e.__esModule) return e;
              var t = {};
              if (null != e)
                for (var n in e) 'default' !== n && Object.prototype.hasOwnProperty.call(e, n) && i(t, e, n);
              return r(t, e), t;
            };
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.FileListRenderer = t.defaultFileListRendererConfig = void 0);
        const o = s(n(741)),
          a = 'file-summary';
        (t.defaultFileListRendererConfig = { colorScheme: o.defaultRenderConfig.colorScheme }),
          (t.FileListRenderer = class {
            constructor(e, n = {}) {
              (this.hoganUtils = e),
                (this.config = Object.assign(Object.assign({}, t.defaultFileListRendererConfig), n));
            }
            render(e) {
              const t = e
                .map((e) =>
                  this.hoganUtils.render(
                    a,
                    'line',
                    {
                      fileHtmlId: o.getHtmlId(e),
                      oldName: e.oldName,
                      newName: e.newName,
                      fileName: o.filenameDiff(e),
                      deletedLines: '-' + e.deletedLines,
                      addedLines: '+' + e.addedLines
                    },
                    { fileIcon: this.hoganUtils.template('icon', o.getFileIcon(e)) }
                  )
                )
                .join('\n');
              return this.hoganUtils.render(a, 'wrapper', {
                colorScheme: o.colorSchemeToCss(this.config.colorScheme),
                filesNumber: e.length,
                files: t
              });
            }
          });
      },
      63: function (e, t, n) {
        'use strict';
        var i =
            (this && this.__createBinding) ||
            (Object.create
              ? function (e, t, n, i) {
                  void 0 === i && (i = n);
                  var r = Object.getOwnPropertyDescriptor(t, n);
                  (r && !('get' in r ? !t.__esModule : r.writable || r.configurable)) ||
                    (r = {
                      enumerable: !0,
                      get: function () {
                        return t[n];
                      }
                    }),
                    Object.defineProperty(e, i, r);
                }
              : function (e, t, n, i) {
                  void 0 === i && (i = n), (e[i] = t[n]);
                }),
          r =
            (this && this.__setModuleDefault) ||
            (Object.create
              ? function (e, t) {
                  Object.defineProperty(e, 'default', { enumerable: !0, value: t });
                }
              : function (e, t) {
                  e.default = t;
                }),
          s =
            (this && this.__importStar) ||
            function (e) {
              if (e && e.__esModule) return e;
              var t = {};
              if (null != e)
                for (var n in e) 'default' !== n && Object.prototype.hasOwnProperty.call(e, n) && i(t, e, n);
              return r(t, e), t;
            };
        Object.defineProperty(t, '__esModule', { value: !0 });
        const o = s(n(485)),
          a = n(979);
        t.default = class {
          constructor({ compiledTemplates: e = {}, rawTemplates: t = {} }) {
            const n = Object.entries(t).reduce((e, [t, n]) => {
              const i = o.compile(n, { asString: !1 });
              return Object.assign(Object.assign({}, e), { [t]: i });
            }, {});
            this.preCompiledTemplates = Object.assign(Object.assign(Object.assign({}, a.defaultTemplates), e), n);
          }
          static compile(e) {
            return o.compile(e, { asString: !1 });
          }
          render(e, t, n, i, r) {
            const s = this.templateKey(e, t);
            try {
              return this.preCompiledTemplates[s].render(n, i, r);
            } catch (e) {
              throw new Error(`Could not find template to render '${s}'`);
            }
          }
          template(e, t) {
            return this.preCompiledTemplates[this.templateKey(e, t)];
          }
          templateKey(e, t) {
            return `${e}-${t}`;
          }
        };
      },
      378: function (e, t, n) {
        'use strict';
        var i =
            (this && this.__createBinding) ||
            (Object.create
              ? function (e, t, n, i) {
                  void 0 === i && (i = n);
                  var r = Object.getOwnPropertyDescriptor(t, n);
                  (r && !('get' in r ? !t.__esModule : r.writable || r.configurable)) ||
                    (r = {
                      enumerable: !0,
                      get: function () {
                        return t[n];
                      }
                    }),
                    Object.defineProperty(e, i, r);
                }
              : function (e, t, n, i) {
                  void 0 === i && (i = n), (e[i] = t[n]);
                }),
          r =
            (this && this.__setModuleDefault) ||
            (Object.create
              ? function (e, t) {
                  Object.defineProperty(e, 'default', { enumerable: !0, value: t });
                }
              : function (e, t) {
                  e.default = t;
                }),
          s =
            (this && this.__importStar) ||
            function (e) {
              if (e && e.__esModule) return e;
              var t = {};
              if (null != e)
                for (var n in e) 'default' !== n && Object.prototype.hasOwnProperty.call(e, n) && i(t, e, n);
              return r(t, e), t;
            };
        Object.defineProperty(t, '__esModule', { value: !0 }), (t.defaultLineByLineRendererConfig = void 0);
        const o = s(n(483)),
          a = s(n(741)),
          l = n(699);
        t.defaultLineByLineRendererConfig = Object.assign(Object.assign({}, a.defaultRenderConfig), {
          renderNothingWhenEmpty: !1,
          matchingMaxComparisons: 2500,
          maxLineSizeInBlockForComparison: 200
        });
        const c = 'generic',
          d = 'line-by-line';
        t.default = class {
          constructor(e, n = {}) {
            (this.hoganUtils = e),
              (this.config = Object.assign(Object.assign({}, t.defaultLineByLineRendererConfig), n));
          }
          render(e) {
            const t = e
              .map((e) => {
                let t;
                return (
                  (t = e.blocks.length ? this.generateFileHtml(e) : this.generateEmptyDiff()),
                  this.makeFileDiffHtml(e, t)
                );
              })
              .join('\n');
            return this.hoganUtils.render(c, 'wrapper', {
              colorScheme: a.colorSchemeToCss(this.config.colorScheme),
              content: t
            });
          }
          makeFileDiffHtml(e, t) {
            if (this.config.renderNothingWhenEmpty && Array.isArray(e.blocks) && 0 === e.blocks.length) return '';
            const n = this.hoganUtils.template(d, 'file-diff'),
              i = this.hoganUtils.template(c, 'file-path'),
              r = this.hoganUtils.template('icon', 'file'),
              s = this.hoganUtils.template('tag', a.getFileIcon(e));
            return n.render({
              file: e,
              fileHtmlId: a.getHtmlId(e),
              diffs: t,
              filePath: i.render({ fileDiffName: a.filenameDiff(e) }, { fileIcon: r, fileTag: s })
            });
          }
          generateEmptyDiff() {
            return this.hoganUtils.render(c, 'empty-diff', {
              contentClass: 'd2h-code-line',
              CSSLineClass: a.CSSLineClass
            });
          }
          generateFileHtml(e) {
            const t = o.newMatcherFn(o.newDistanceFn((t) => a.deconstructLine(t.content, e.isCombined).content));
            return e.blocks
              .map((n) => {
                let i = this.hoganUtils.render(c, 'block-header', {
                  CSSLineClass: a.CSSLineClass,
                  blockHeader: e.isTooBig ? n.header : a.escapeForHtml(n.header),
                  lineClass: 'd2h-code-linenumber',
                  contentClass: 'd2h-code-line'
                });
                return (
                  this.applyLineGroupping(n).forEach(([n, r, s]) => {
                    if (r.length && s.length && !n.length)
                      this.applyRematchMatching(r, s, t).map(([t, n]) => {
                        const { left: r, right: s } = this.processChangedLines(e, e.isCombined, t, n);
                        (i += r), (i += s);
                      });
                    else if (n.length)
                      n.forEach((t) => {
                        const { prefix: n, content: r } = a.deconstructLine(t.content, e.isCombined);
                        i += this.generateSingleLineHtml(e, {
                          type: a.CSSLineClass.CONTEXT,
                          prefix: n,
                          content: r,
                          oldNumber: t.oldNumber,
                          newNumber: t.newNumber
                        });
                      });
                    else if (r.length || s.length) {
                      const { left: t, right: n } = this.processChangedLines(e, e.isCombined, r, s);
                      (i += t), (i += n);
                    } else console.error('Unknown state reached while processing groups of lines', n, r, s);
                  }),
                  i
                );
              })
              .join('\n');
          }
          applyLineGroupping(e) {
            const t = [];
            let n = [],
              i = [];
            for (let r = 0; r < e.lines.length; r++) {
              const s = e.lines[r];
              ((s.type !== l.LineType.INSERT && i.length) || (s.type === l.LineType.CONTEXT && n.length > 0)) &&
                (t.push([[], n, i]), (n = []), (i = [])),
                s.type === l.LineType.CONTEXT
                  ? t.push([[s], [], []])
                  : s.type === l.LineType.INSERT && 0 === n.length
                  ? t.push([[], [], [s]])
                  : s.type === l.LineType.INSERT && n.length > 0
                  ? i.push(s)
                  : s.type === l.LineType.DELETE && n.push(s);
            }
            return (n.length || i.length) && (t.push([[], n, i]), (n = []), (i = [])), t;
          }
          applyRematchMatching(e, t, n) {
            const i = e.length * t.length,
              r = Math.max.apply(null, [0].concat(e.concat(t).map((e) => e.content.length)));
            return i < this.config.matchingMaxComparisons &&
              r < this.config.maxLineSizeInBlockForComparison &&
              ('lines' === this.config.matching || 'words' === this.config.matching)
              ? n(e, t)
              : [[e, t]];
          }
          processChangedLines(e, t, n, i) {
            const r = { right: '', left: '' },
              s = Math.max(n.length, i.length);
            for (let o = 0; o < s; o++) {
              const s = n[o],
                l = i[o],
                c = void 0 !== s && void 0 !== l ? a.diffHighlight(s.content, l.content, t, this.config) : void 0,
                d =
                  void 0 !== s && void 0 !== s.oldNumber
                    ? Object.assign(
                        Object.assign(
                          {},
                          void 0 !== c
                            ? {
                                prefix: c.oldLine.prefix,
                                content: c.oldLine.content,
                                type: a.CSSLineClass.DELETE_CHANGES
                              }
                            : Object.assign(Object.assign({}, a.deconstructLine(s.content, t)), {
                                type: a.toCSSClass(s.type)
                              })
                        ),
                        { oldNumber: s.oldNumber, newNumber: s.newNumber }
                      )
                    : void 0,
                f =
                  void 0 !== l && void 0 !== l.newNumber
                    ? Object.assign(
                        Object.assign(
                          {},
                          void 0 !== c
                            ? {
                                prefix: c.newLine.prefix,
                                content: c.newLine.content,
                                type: a.CSSLineClass.INSERT_CHANGES
                              }
                            : Object.assign(Object.assign({}, a.deconstructLine(l.content, t)), {
                                type: a.toCSSClass(l.type)
                              })
                        ),
                        { oldNumber: l.oldNumber, newNumber: l.newNumber }
                      )
                    : void 0,
                { left: u, right: h } = this.generateLineHtml(e, d, f);
              (r.left += u), (r.right += h);
            }
            return r;
          }
          generateLineHtml(e, t, n) {
            return { left: this.generateSingleLineHtml(e, t), right: this.generateSingleLineHtml(e, n) };
          }
          generateSingleLineHtml(e, t) {
            if (void 0 === t) return '';
            const n = this.hoganUtils.render(d, 'numbers', {
              oldNumber: t.oldNumber || '',
              newNumber: t.newNumber || ''
            });
            return this.hoganUtils.render(c, 'line', {
              type: t.type,
              lineClass: 'd2h-code-linenumber',
              contentClass: 'd2h-code-line',
              prefix: ' ' === t.prefix ? '&nbsp;' : t.prefix,
              content: t.content,
              lineNumber: n,
              line: t,
              file: e
            });
          }
        };
      },
      483: (e, t) => {
        'use strict';
        function n(e, t) {
          if (0 === e.length) return t.length;
          if (0 === t.length) return e.length;
          const n = [];
          let i, r;
          for (i = 0; i <= t.length; i++) n[i] = [i];
          for (r = 0; r <= e.length; r++) n[0][r] = r;
          for (i = 1; i <= t.length; i++)
            for (r = 1; r <= e.length; r++)
              t.charAt(i - 1) === e.charAt(r - 1)
                ? (n[i][r] = n[i - 1][r - 1])
                : (n[i][r] = Math.min(n[i - 1][r - 1] + 1, Math.min(n[i][r - 1] + 1, n[i - 1][r] + 1)));
          return n[t.length][e.length];
        }
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.newMatcherFn = t.newDistanceFn = t.levenshtein = void 0),
          (t.levenshtein = n),
          (t.newDistanceFn = function (e) {
            return (t, i) => {
              const r = e(t).trim(),
                s = e(i).trim();
              return n(r, s) / (r.length + s.length);
            };
          }),
          (t.newMatcherFn = function (e) {
            return function t(n, i, r = 0, s = new Map()) {
              const o = (function (t, n, i = new Map()) {
                let r,
                  s = 1 / 0;
                for (let o = 0; o < t.length; ++o)
                  for (let a = 0; a < n.length; ++a) {
                    const l = JSON.stringify([t[o], n[a]]);
                    let c;
                    (i.has(l) && (c = i.get(l))) || ((c = e(t[o], n[a])), i.set(l, c)),
                      c < s && ((s = c), (r = { indexA: o, indexB: a, score: s }));
                  }
                return r;
              })(n, i, s);
              if (!o || n.length + i.length < 3) return [[n, i]];
              const a = n.slice(0, o.indexA),
                l = i.slice(0, o.indexB),
                c = [n[o.indexA]],
                d = [i[o.indexB]],
                f = o.indexA + 1,
                u = o.indexB + 1,
                h = n.slice(f),
                p = i.slice(u),
                b = t(a, l, r + 1, s),
                g = t(c, d, r + 1, s),
                m = t(h, p, r + 1, s);
              let v = g;
              return (
                (o.indexA > 0 || o.indexB > 0) && (v = b.concat(v)),
                (n.length > f || i.length > u) && (v = v.concat(m)),
                v
              );
            };
          });
      },
      741: function (e, t, n) {
        'use strict';
        var i =
            (this && this.__createBinding) ||
            (Object.create
              ? function (e, t, n, i) {
                  void 0 === i && (i = n);
                  var r = Object.getOwnPropertyDescriptor(t, n);
                  (r && !('get' in r ? !t.__esModule : r.writable || r.configurable)) ||
                    (r = {
                      enumerable: !0,
                      get: function () {
                        return t[n];
                      }
                    }),
                    Object.defineProperty(e, i, r);
                }
              : function (e, t, n, i) {
                  void 0 === i && (i = n), (e[i] = t[n]);
                }),
          r =
            (this && this.__setModuleDefault) ||
            (Object.create
              ? function (e, t) {
                  Object.defineProperty(e, 'default', { enumerable: !0, value: t });
                }
              : function (e, t) {
                  e.default = t;
                }),
          s =
            (this && this.__importStar) ||
            function (e) {
              if (e && e.__esModule) return e;
              var t = {};
              if (null != e)
                for (var n in e) 'default' !== n && Object.prototype.hasOwnProperty.call(e, n) && i(t, e, n);
              return r(t, e), t;
            };
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.diffHighlight =
            t.getFileIcon =
            t.getHtmlId =
            t.filenameDiff =
            t.deconstructLine =
            t.escapeForHtml =
            t.colorSchemeToCss =
            t.toCSSClass =
            t.defaultRenderConfig =
            t.CSSLineClass =
              void 0);
        const o = s(n(785)),
          a = n(593),
          l = s(n(483)),
          c = n(699);
        (t.CSSLineClass = {
          INSERTS: 'd2h-ins',
          DELETES: 'd2h-del',
          CONTEXT: 'd2h-cntx',
          INFO: 'd2h-info',
          INSERT_CHANGES: 'd2h-ins d2h-change',
          DELETE_CHANGES: 'd2h-del d2h-change'
        }),
          (t.defaultRenderConfig = {
            matching: c.LineMatchingType.NONE,
            matchWordsThreshold: 0.25,
            maxLineLengthHighlight: 1e4,
            diffStyle: c.DiffStyleType.WORD,
            colorScheme: c.ColorSchemeType.LIGHT
          });
        const d = '/',
          f = l.newDistanceFn((e) => e.value),
          u = l.newMatcherFn(f);
        function h(e) {
          return -1 !== e.indexOf('dev/null');
        }
        function p(e) {
          return e.replace(/(<del[^>]*>((.|\n)*?)<\/del>)/g, '');
        }
        function b(e) {
          return e
            .slice(0)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
        }
        function g(e, t, n = !0) {
          const i = (function (e) {
            return e ? 2 : 1;
          })(t);
          return { prefix: e.substring(0, i), content: n ? b(e.substring(i)) : e.substring(i) };
        }
        function m(e) {
          const t = (0, a.unifyPath)(e.oldName),
            n = (0, a.unifyPath)(e.newName);
          if (t === n || h(t) || h(n)) return h(n) ? t : n;
          {
            const e = [],
              i = [],
              r = t.split(d),
              s = n.split(d);
            let o = 0,
              a = r.length - 1,
              l = s.length - 1;
            for (; o < a && o < l && r[o] === s[o]; ) e.push(s[o]), (o += 1);
            for (; a > o && l > o && r[a] === s[l]; ) i.unshift(s[l]), (a -= 1), (l -= 1);
            const c = e.join(d),
              f = i.join(d),
              u = r.slice(o, a + 1).join(d),
              h = s.slice(o, l + 1).join(d);
            return c.length && f.length
              ? c + d + '{' + u + ' → ' + h + '}' + d + f
              : c.length
              ? c + d + '{' + u + ' → ' + h + '}'
              : f.length
              ? '{' + u + ' → ' + h + '}' + d + f
              : t + ' → ' + n;
          }
        }
        (t.toCSSClass = function (e) {
          switch (e) {
            case c.LineType.CONTEXT:
              return t.CSSLineClass.CONTEXT;
            case c.LineType.INSERT:
              return t.CSSLineClass.INSERTS;
            case c.LineType.DELETE:
              return t.CSSLineClass.DELETES;
          }
        }),
          (t.colorSchemeToCss = function (e) {
            switch (e) {
              case c.ColorSchemeType.DARK:
                return 'd2h-dark-color-scheme';
              case c.ColorSchemeType.AUTO:
                return 'd2h-auto-color-scheme';
              case c.ColorSchemeType.LIGHT:
              default:
                return 'd2h-light-color-scheme';
            }
          }),
          (t.escapeForHtml = b),
          (t.deconstructLine = g),
          (t.filenameDiff = m),
          (t.getHtmlId = function (e) {
            return `d2h-${(0, a.hashCode)(m(e)).toString().slice(-6)}`;
          }),
          (t.getFileIcon = function (e) {
            let t = 'file-changed';
            return (
              e.isRename || e.isCopy
                ? (t = 'file-renamed')
                : e.isNew
                ? (t = 'file-added')
                : e.isDeleted
                ? (t = 'file-deleted')
                : e.newName !== e.oldName && (t = 'file-renamed'),
              t
            );
          }),
          (t.diffHighlight = function (e, n, i, r = {}) {
            const {
                matching: s,
                maxLineLengthHighlight: a,
                matchWordsThreshold: l,
                diffStyle: c
              } = Object.assign(Object.assign({}, t.defaultRenderConfig), r),
              d = g(e, i, !1),
              h = g(n, i, !1);
            if (d.content.length > a || h.content.length > a)
              return {
                oldLine: { prefix: d.prefix, content: b(d.content) },
                newLine: { prefix: h.prefix, content: b(h.content) }
              };
            const m = 'char' === c ? o.diffChars(d.content, h.content) : o.diffWordsWithSpace(d.content, h.content),
              v = [];
            if ('word' === c && 'words' === s) {
              const e = m.filter((e) => e.removed),
                t = m.filter((e) => e.added);
              u(t, e).forEach((e) => {
                1 === e[0].length && 1 === e[1].length && f(e[0][0], e[1][0]) < l && (v.push(e[0][0]), v.push(e[1][0]));
              });
            }
            const y = m.reduce((e, t) => {
              const n = t.added ? 'ins' : t.removed ? 'del' : null,
                i = v.indexOf(t) > -1 ? ' class="d2h-change"' : '',
                r = b(t.value);
              return null !== n ? `${e}<${n}${i}>${r}</${n}>` : `${e}${r}`;
            }, '');
            return {
              oldLine: { prefix: d.prefix, content: ((w = y), w.replace(/(<ins[^>]*>((.|\n)*?)<\/ins>)/g, '')) },
              newLine: { prefix: h.prefix, content: p(y) }
            };
            var w;
          });
      },
      170: function (e, t, n) {
        'use strict';
        var i =
            (this && this.__createBinding) ||
            (Object.create
              ? function (e, t, n, i) {
                  void 0 === i && (i = n);
                  var r = Object.getOwnPropertyDescriptor(t, n);
                  (r && !('get' in r ? !t.__esModule : r.writable || r.configurable)) ||
                    (r = {
                      enumerable: !0,
                      get: function () {
                        return t[n];
                      }
                    }),
                    Object.defineProperty(e, i, r);
                }
              : function (e, t, n, i) {
                  void 0 === i && (i = n), (e[i] = t[n]);
                }),
          r =
            (this && this.__setModuleDefault) ||
            (Object.create
              ? function (e, t) {
                  Object.defineProperty(e, 'default', { enumerable: !0, value: t });
                }
              : function (e, t) {
                  e.default = t;
                }),
          s =
            (this && this.__importStar) ||
            function (e) {
              if (e && e.__esModule) return e;
              var t = {};
              if (null != e)
                for (var n in e) 'default' !== n && Object.prototype.hasOwnProperty.call(e, n) && i(t, e, n);
              return r(t, e), t;
            };
        Object.defineProperty(t, '__esModule', { value: !0 }), (t.defaultSideBySideRendererConfig = void 0);
        const o = s(n(483)),
          a = s(n(741)),
          l = n(699);
        t.defaultSideBySideRendererConfig = Object.assign(Object.assign({}, a.defaultRenderConfig), {
          renderNothingWhenEmpty: !1,
          matchingMaxComparisons: 2500,
          maxLineSizeInBlockForComparison: 200
        });
        const c = 'generic';
        t.default = class {
          constructor(e, n = {}) {
            (this.hoganUtils = e),
              (this.config = Object.assign(Object.assign({}, t.defaultSideBySideRendererConfig), n));
          }
          render(e) {
            const t = e
              .map((e) => {
                let t;
                return (
                  (t = e.blocks.length ? this.generateFileHtml(e) : this.generateEmptyDiff()),
                  this.makeFileDiffHtml(e, t)
                );
              })
              .join('\n');
            return this.hoganUtils.render(c, 'wrapper', {
              colorScheme: a.colorSchemeToCss(this.config.colorScheme),
              content: t
            });
          }
          makeFileDiffHtml(e, t) {
            if (this.config.renderNothingWhenEmpty && Array.isArray(e.blocks) && 0 === e.blocks.length) return '';
            const n = this.hoganUtils.template('side-by-side', 'file-diff'),
              i = this.hoganUtils.template(c, 'file-path'),
              r = this.hoganUtils.template('icon', 'file'),
              s = this.hoganUtils.template('tag', a.getFileIcon(e));
            return n.render({
              file: e,
              fileHtmlId: a.getHtmlId(e),
              diffs: t,
              filePath: i.render({ fileDiffName: a.filenameDiff(e) }, { fileIcon: r, fileTag: s })
            });
          }
          generateEmptyDiff() {
            return {
              right: '',
              left: this.hoganUtils.render(c, 'empty-diff', {
                contentClass: 'd2h-code-side-line',
                CSSLineClass: a.CSSLineClass
              })
            };
          }
          generateFileHtml(e) {
            const t = o.newMatcherFn(o.newDistanceFn((t) => a.deconstructLine(t.content, e.isCombined).content));
            return e.blocks
              .map((n) => {
                const i = { left: this.makeHeaderHtml(n.header, e), right: this.makeHeaderHtml('') };
                return (
                  this.applyLineGroupping(n).forEach(([n, r, s]) => {
                    if (r.length && s.length && !n.length)
                      this.applyRematchMatching(r, s, t).map(([t, n]) => {
                        const { left: r, right: s } = this.processChangedLines(e.isCombined, t, n);
                        (i.left += r), (i.right += s);
                      });
                    else if (n.length)
                      n.forEach((t) => {
                        const { prefix: n, content: r } = a.deconstructLine(t.content, e.isCombined),
                          { left: s, right: o } = this.generateLineHtml(
                            { type: a.CSSLineClass.CONTEXT, prefix: n, content: r, number: t.oldNumber },
                            { type: a.CSSLineClass.CONTEXT, prefix: n, content: r, number: t.newNumber }
                          );
                        (i.left += s), (i.right += o);
                      });
                    else if (r.length || s.length) {
                      const { left: t, right: n } = this.processChangedLines(e.isCombined, r, s);
                      (i.left += t), (i.right += n);
                    } else console.error('Unknown state reached while processing groups of lines', n, r, s);
                  }),
                  i
                );
              })
              .reduce((e, t) => ({ left: e.left + t.left, right: e.right + t.right }), { left: '', right: '' });
          }
          applyLineGroupping(e) {
            const t = [];
            let n = [],
              i = [];
            for (let r = 0; r < e.lines.length; r++) {
              const s = e.lines[r];
              ((s.type !== l.LineType.INSERT && i.length) || (s.type === l.LineType.CONTEXT && n.length > 0)) &&
                (t.push([[], n, i]), (n = []), (i = [])),
                s.type === l.LineType.CONTEXT
                  ? t.push([[s], [], []])
                  : s.type === l.LineType.INSERT && 0 === n.length
                  ? t.push([[], [], [s]])
                  : s.type === l.LineType.INSERT && n.length > 0
                  ? i.push(s)
                  : s.type === l.LineType.DELETE && n.push(s);
            }
            return (n.length || i.length) && (t.push([[], n, i]), (n = []), (i = [])), t;
          }
          applyRematchMatching(e, t, n) {
            const i = e.length * t.length,
              r = Math.max.apply(null, [0].concat(e.concat(t).map((e) => e.content.length)));
            return i < this.config.matchingMaxComparisons &&
              r < this.config.maxLineSizeInBlockForComparison &&
              ('lines' === this.config.matching || 'words' === this.config.matching)
              ? n(e, t)
              : [[e, t]];
          }
          makeHeaderHtml(e, t) {
            return this.hoganUtils.render(c, 'block-header', {
              CSSLineClass: a.CSSLineClass,
              blockHeader: (null == t ? void 0 : t.isTooBig) ? e : a.escapeForHtml(e),
              lineClass: 'd2h-code-side-linenumber',
              contentClass: 'd2h-code-side-line'
            });
          }
          processChangedLines(e, t, n) {
            const i = { right: '', left: '' },
              r = Math.max(t.length, n.length);
            for (let s = 0; s < r; s++) {
              const r = t[s],
                o = n[s],
                l = void 0 !== r && void 0 !== o ? a.diffHighlight(r.content, o.content, e, this.config) : void 0,
                c =
                  void 0 !== r && void 0 !== r.oldNumber
                    ? Object.assign(
                        Object.assign(
                          {},
                          void 0 !== l
                            ? {
                                prefix: l.oldLine.prefix,
                                content: l.oldLine.content,
                                type: a.CSSLineClass.DELETE_CHANGES
                              }
                            : Object.assign(Object.assign({}, a.deconstructLine(r.content, e)), {
                                type: a.toCSSClass(r.type)
                              })
                        ),
                        { number: r.oldNumber }
                      )
                    : void 0,
                d =
                  void 0 !== o && void 0 !== o.newNumber
                    ? Object.assign(
                        Object.assign(
                          {},
                          void 0 !== l
                            ? {
                                prefix: l.newLine.prefix,
                                content: l.newLine.content,
                                type: a.CSSLineClass.INSERT_CHANGES
                              }
                            : Object.assign(Object.assign({}, a.deconstructLine(o.content, e)), {
                                type: a.toCSSClass(o.type)
                              })
                        ),
                        { number: o.newNumber }
                      )
                    : void 0,
                { left: f, right: u } = this.generateLineHtml(c, d);
              (i.left += f), (i.right += u);
            }
            return i;
          }
          generateLineHtml(e, t) {
            return { left: this.generateSingleHtml(e), right: this.generateSingleHtml(t) };
          }
          generateSingleHtml(e) {
            const t = 'd2h-code-side-linenumber',
              n = 'd2h-code-side-line';
            return this.hoganUtils.render(c, 'line', {
              type: (null == e ? void 0 : e.type) || `${a.CSSLineClass.CONTEXT} d2h-emptyplaceholder`,
              lineClass: void 0 !== e ? t : `${t} d2h-code-side-emptyplaceholder`,
              contentClass: void 0 !== e ? n : `${n} d2h-code-side-emptyplaceholder`,
              prefix: ' ' === (null == e ? void 0 : e.prefix) ? '&nbsp;' : null == e ? void 0 : e.prefix,
              content: null == e ? void 0 : e.content,
              lineNumber: null == e ? void 0 : e.number
            });
          }
        };
      },
      699: (e, t) => {
        'use strict';
        var n, i;
        Object.defineProperty(t, '__esModule', { value: !0 }),
          (t.ColorSchemeType = t.DiffStyleType = t.LineMatchingType = t.OutputFormatType = t.LineType = void 0),
          (function (e) {
            (e.INSERT = 'insert'), (e.DELETE = 'delete'), (e.CONTEXT = 'context');
          })(n || (t.LineType = n = {})),
          (t.OutputFormatType = { LINE_BY_LINE: 'line-by-line', SIDE_BY_SIDE: 'side-by-side' }),
          (t.LineMatchingType = { LINES: 'lines', WORDS: 'words', NONE: 'none' }),
          (t.DiffStyleType = { WORD: 'word', CHAR: 'char' }),
          (function (e) {
            (e.AUTO = 'auto'), (e.DARK = 'dark'), (e.LIGHT = 'light');
          })(i || (t.ColorSchemeType = i = {}));
      },
      593: (e, t) => {
        'use strict';
        Object.defineProperty(t, '__esModule', { value: !0 }), (t.hashCode = t.unifyPath = t.escapeForRegExp = void 0);
        const n = RegExp(
          '[' + ['-', '[', ']', '/', '{', '}', '(', ')', '*', '+', '?', '.', '\\', '^', '$', '|'].join('\\') + ']',
          'g'
        );
        (t.escapeForRegExp = function (e) {
          return e.replace(n, '\\$&');
        }),
          (t.unifyPath = function (e) {
            return e ? e.replace(/\\/g, '/') : e;
          }),
          (t.hashCode = function (e) {
            let t,
              n,
              i,
              r = 0;
            for (t = 0, i = e.length; t < i; t++) (n = e.charCodeAt(t)), (r = (r << 5) - r + n), (r |= 0);
            return r;
          });
      }
    }),
    (t = {}),
    (function n(i) {
      var r = t[i];
      if (void 0 !== r) return r.exports;
      var s = (t[i] = { exports: {} });
      return e[i].call(s.exports, s, s.exports, n), s.exports;
    })(834)
  );
  var e, t;
});
