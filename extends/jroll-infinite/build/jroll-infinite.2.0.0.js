/*! JRoll-Infinite v2.0.0 ~ (c) 2015-2016 Author:BarZu Git:https://git.oschina.net/chenjianlong/JRoll2/ */
(function(window, document, JRoll) {
  "use strict";

  function compile(text) {
    var t = text;
    var s = "'use strict';\nvar __t='';__t+='";
    var i = 0;
    var r = /\{\{=([^\{]+)\}\}|\{\{(each [\w\$\._]+ as [\w\$_]+ [\w\$_]+)\}\}|\{\{if ([^\{]+)\}\}|\{\{(else)\}\}|\{\{else if ([^\{]+)\}\}|(\{\{\/each\}\}|\{\{\/if\}\})|\{\{([^\{]+)\}\}/g;
    //预处理，去除多余空格、回车、转换单引号
    t = t.replace(/(\n|\r)|(\{\{\s+)|(\s+\}\})|(\s{2,})|(')/g, function(match, enter, left, right, space, quote) {
      var temp;
      if (enter) {
        temp = "";
      } else if (left) {
        temp = "{{";
      } else if (right) {
        temp = "}}";
      } else if (space) {
        temp = " ";
      } else if (quote) {
        temp = "\\\'";
      }
      return temp;
    });
    //替换字符串
    t.replace(r, function(match, _value, _each, _if, _else, _elseif, _close, _other, offset) {
      s += t.slice(i, offset);
      i = offset + match.length;

      if (_value) {
        s += "'+(" + _value.replace(/\\\'/g, "'") + ")+'";
      } else if (_each) {
        var p = _each.split(" ");
        s += "';\nfor(var " + p[4] + "=0," + p[3] + ";" + p[4] + "<" + p[1] + ".length;" + p[4] + "++){\n" + p[3] + "=" + p[1] + "[" + p[4] + "];\n__t+='";
      } else if (_if) {
        s += "';\nif(" + _if.replace(/\\\'/g, "'") + "){\n__t+='";
      } else if (_else) {
        s += "';\n}else{\n__t+='";
      } else if (_elseif) {
        s += "';\n}else if(" + _elseif.replace(/\\\'/g, "'") + "){\n__t+='";
      } else if (_close) {
        s += "';\n};\n__t+='";
      } else if (_other) {
        s += "';\n" + _other.replace(/\\\'/g, "'") + ";\n__t+='";
      }
      return match;
    });
    s += t.slice(i) + "\';return __t;";

    return new Function("_obj", s);
  }

  //返回字符串形式的html
  function render(compiled, data) {
    return compiled(data);
  }

  JRoll.prototype.infinite = function(params) {
    var me = this,
      lock,
      compiled, clearRegExp,
      keys = Object.keys(params || {});

    //默认选项
    var options = {
      total: 99,
      getData: null,
      blank: false, //开启之后，不在屏幕上的页面会display:none，可降低内存的使用
      template: "", //每条数据模板
      loadingTip: "<div class=\"jroll-infinite-tip\">正在加载...</div>", //正在加载提示信息
      completeTip: "<div class=\"jroll-infinite-tip\">已加载全部内容</div>", //加载完成提示信息
      compile: compile, //编译方法
      render: render //渲染方法
    };

    for (var k in keys) {
      options[keys[k]] = params[keys[k]];
    }

    me.options.total = options.total;
    me.options.page = 1;
    me.infinite_callback = callback;
    compiled = options.compile(options.template);

    //创建jroll-infinite的jroll-style样式
    var jroll_style = document.getElementById("jroll_style");
    var infinite_style = "\n/* jroll-infinite */\n.jroll-infinite-hide>*{display:none}\n";
    if (jroll_style) {
      if (!/jroll-infinite/.test(jroll_style.innerHTML)) {
        jroll_style.innerHTML += infinite_style;
      }
    } else {
      jroll_style = document.createElement("style");
      jroll_style.id = "jroll_style";
      jroll_style.innerHTML = infinite_style;
      document.head.appendChild(jroll_style);
    }

    //如果提示语含图片，预加载并缓存图片
    document.createElement("div").innerHTML = options.loadingTip + options.completeTip;

    //首次加载数据
    if (typeof options.getData === "function") {
      me.scroller.innerHTML = options.loadingTip;
      options.getData(me.options.page, callback);
    }

    clearRegExp = new RegExp("(" + filterRegChar(options.loadingTip) + "|" + filterRegChar(options.completeTip) + ")", "g");

    //滑动结束，加载下一页
    me.on("scrollEnd", function() {
      if (me.y < me.maxScrollY + me.scroller.querySelector(".jroll-infinite-tip").offsetHeight && me.options.page !== me.options.total && !lock) {

        lock = true; //防止数据加载完成前触发加载下一页
        options.getData(++me.options.page, callback);

      }

      lightenPage();
    });

    //过滤正则特殊字符，由于不能保证浏览转换成innerHTML时单双引号的正确性，因此要特殊处理
    function filterRegChar(str) {
      return str.replace(/("|')|\$|\(|\)|\+|\*|\.|\[|\]|\?|\\|\^|\{|\}|\|/g, function(match, quote) {
        return quote ? "[\"']" : "\\" + match;
      });
    }

    //渲染视图
    function callback(data) {
      var html;

      lock = false;

      if (!data) return;

      html = "<section class='jroll-infinite-page'>";

      for (var i = 0, l = data.length; i < l; i++) {
        html += options.render(compiled, data[i], i);
      }
      html += "</section>";

      html += options.total === me.options.page ? options.completeTip : options.loadingTip;

      me.scroller.innerHTML = me.scroller.innerHTML.replace(clearRegExp, "") + html;

      me.refresh();

      setTimeout(function() {
        var pages = me.scroller.querySelectorAll(".jroll-infinite-page");
        var last = pages[pages.length - 1];
        if (last) {
          last.style.height = last.offsetHeight + "px";
        }
        lightenPage(pages);
      }, 10);

    }

    //减轻页面，隐藏不在屏幕的页面
    function lightenPage(sections) {
      if (options.blank) {
        var pages = sections || me.scroller.querySelectorAll(".jroll-infinite-page");
        var h = me.wrapper.clientHeight;
        var p = me.y;
        for (var i = 0, l = pages.length; i < l; i++) {
          //在可视区域外
          if (pages[i].offsetTop - h + p > 0 || pages[i].offsetTop + pages[i].offsetHeight + p < 0) {
            pages[i].classList.add("jroll-infinite-hide");
          } else { //内
            pages[i].classList.remove("jroll-infinite-hide");
          }
        }
      }
    }

  };

  //CommonJS/AMD/CMD规范导出JRoll
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = JRoll;
  }
  if (typeof define === 'function') {
    define(function() {
      return JRoll;
    });
  }
})(window, document, JRoll);