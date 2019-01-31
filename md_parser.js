// MD解析入口
function md(src) {
    return Parser.parse(Lexer.lex(src));
}

// Markdown词法分析器
function Lexer() {
    this.tokens = [];
}

// 词法分析器核心
Lexer.rules = {
    newline: /^\n+/,
    heading: /^ *(#{1,6}) +([^\n]+?)(?:\n+|$)/,
    codeblock: /^ *`{3} *\n{1}([\S\s]*?)\n{0,1}`{3}/,
    orderedlist: /^ *[\d]+\. +[^\n]*(?:\n *[\d]+\. +[^\n]*)*/,
    items: /^( *)\d+\. +[^\n]*(\n(?!\1\d+\. +)[^\n]*)*/gm,
    text: /^ *\d+\. +([^\n]*)/,
    paragraph: /^[^\n]+(?:\n(?!heading|codeblock)[^\n]+)*/
};

Lexer.rules.paragraph = edit(Lexer.rules.paragraph)
.replace('heading',' *#{1,6} +[^\\n]+')
.replace('codeblock',' *`{3} *\\n{1}[\\S\\s]*?\\n`{3}')
.getRegex();

function edit(regex) {
    regex = regex.source || regex;
    return {
        replace: function(name, val) {
            val = val.source || val;
            regex = regex.replace(name, val);
            return this;
        },
        getRegex: function() {
            return new RegExp(regex);
        }
    };
}

// 词法分析器静态函数
Lexer.lex = function(src) {
    var lexer = new Lexer();
    return lexer.lex(src);
};

// 将字符串转换为单词（Token）序列
Lexer.prototype.lex = function(src) {
    while(src) {
        if(cap = Lexer.rules.newline.exec(src)) {
            src = src.substring(cap[0].length);
            continue;
        } else if(cap = Lexer.rules.heading.exec(src)) {
            src = src.substring(cap[0].length);
            this.tokens.push({
                type: 'heading',
                level: cap[1].length,
                text: cap[2]
            });
            continue;
        } else if(cap = Lexer.rules.codeblock.exec(src)) {
            src = src.substring(cap[0].length);
            this.tokens.push({
                type: 'codeblock',
                text: cap[1]
            });
            continue;
        } else if(cap = Lexer.rules.orderedlist.exec(src)) {
            // console.log('词法解析开始：')
            // console.log(new Date().getTime());
            src = src.substring(cap[0].length);
            var list=[];
            var dataNode = new DataNode();
            dataNode.element = 'root';
            list.push(dataNode)
            mdlist(cap[0], list, dataNode);
            this.tokens.push({
                type: 'orderedlist',
                struct: list
            });
            // console.log('词法解析结束：')
            // console.log(new Date().getTime());
            continue;
        } else if(cap = Lexer.rules.paragraph.exec(src)) {
            src = src.substring(cap[0].length);
            this.tokens.push({
                type: 'paragraph',
                text: cap[0]
            })
            continue;
        } else {
            src = '';
            continue;
        }
    }
    return this.tokens;
};

// Markdown语法分析器
function Parser() {
    this.out = '';
}

// 语法分析器静态函数
Parser.parse = function(tokens) {
    var parser = new Parser();
    return parser.parse(tokens);
}

// 将词法分析结果语法分析为html语句
Parser.prototype.parse = function(tokens) {
    tokens.forEach(token => {
        switch(token.type) {
            case 'heading': {
                this.out += '<h' + token.level + '>' + token.text + '</h' + token.level +'>\n';
                break;
            }
            case 'codeblock': {
                this.out += '<pre><code>' + token.text + '</code></pre>\n';
                break;
            }
            case 'orderedlist': {
                // console.log('语法解析开始：')
                // console.log(new Date().getTime());
                list = token.struct;
                this.out += readTreeStruct(list, list[0]);
                // console.log('语法解析结束：')
                // console.log(new Date().getTime());
                break;
            }
            case 'paragraph': {
                this.out += '<p>' + token.text + '</p>\n';
                break;
            }
        }
    });
    return this.out;
}

function Item(){}

function ChildNode() {}

function DataNode() {}

function readTreeStruct(list, node) {
    out = ''
    var childnode = node.firstchild;
    if(childnode === null) {
        return out;
    }
    out += '<ol>';
    while(true) {
        datanode = list[childnode.index];
        element = datanode.element;
        out += '<li>' + element;
        if(datanode.firstchild != null){
            out += readTreeStruct(list, datanode) + '</li>'
        } else {
            out += '</li>';
        }
        if(childnode.next == null) {
            out += '</ol>';
            return out;
        }
        childnode = childnode.next;
    }
}

function mdlist(src, list, beforeNode) {
    items = src.match(Lexer.rules.items);
    if(items !== null) {
        var index = 0;
        var beforeChildNode;
        items.forEach(item => {
            result = Lexer.rules.text.exec(item);
            item = item.substring(result[0].length);
            text = result[1];
            var dataNode = new DataNode();
            dataNode.element = text;
            if(item === "") {
                dataNode.firstchild = null;
            }
            list.push(dataNode);
            if (index === 0) {
                var childNode = new ChildNode();
                childNode.index = list.length - 1;
                beforeNode.firstchild = childNode;
                beforeChildNode = childNode;
            } else {
                var childNode = new ChildNode();
                childNode.index = list.length - 1;
                beforeChildNode.next = childNode;
                beforeChildNode = childNode;
            }
            index++;
            mdlist(item, list, dataNode);
        });
        beforeChildNode.next = null;
    } 
    return;
}