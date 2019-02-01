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
    orderlist: /^ *[\d]+\. +[^\n]*(?:\n *[\d]+\. +[^\n]*)*/,
    item: /^( *)\d+\. +[^\n]*(\n(?!\1\d+\. +)[^\n]*)*/gm,
    text: /^ *\d+\. +([^\n]*)/,
    paragraph: /^[^\n]+(?:\n(?!heading|codeblock|orderlist)[^\n]+)*/
};

Lexer.rules.paragraph = edit(Lexer.rules.paragraph)
.replace('heading',' *#{1,6} +[^\\n]+')
.replace('codeblock',' *`{3} *\\n{1}[\\S\\s]*?\\n`{3}')
.replace('orderlist',' *[\\d]+\\. +')
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
        if(result = Lexer.rules.newline.exec(src)) {
            src = src.substring(result[0].length);
            continue;
        } else if(result = Lexer.rules.heading.exec(src)) {
            src = src.substring(result[0].length);
            this.tokens.push({
                type: 'heading',
                level: result[1].length,
                text: result[2]
            });
            continue;
        } else if(result = Lexer.rules.codeblock.exec(src)) {
            src = src.substring(result[0].length);
            this.tokens.push({
                type: 'codeblock',
                text: result[1]
            });
            continue;
        } else if(result = Lexer.rules.orderlist.exec(src)) {
            src = src.substring(result[0].length);
            // 初始化根节点
            var treeNodes = [];
            var treeNode = new TreeNode();
            treeNode.text = 'root';
            treeNodes.push(treeNode);
            
            analyseOrderlist(result[0], treeNodes, treeNode);
            this.tokens.push({
                type: 'orderlist',
                nodes: treeNodes
            });
            continue;
        } else if(result = Lexer.rules.paragraph.exec(src)) {
            src = src.substring(result[0].length);
            this.tokens.push({
                type: 'paragraph',
                text: result[0]
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
            case 'orderlist': {
                nodes = token.nodes;
                this.out += parseOrderlist(nodes, nodes[0]);
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

function ChildNode() {}

function TreeNode() {}

// 解析有序列表为html代码
function parseOrderlist(nodes, node) {
    let out = '';
    let firstChild = node.firstChild;
    if(firstChild === null) {
        return out;
    }
    out += '<ol>';
    while(true) {
        let node = nodes[firstChild.index];
        let text = node.element;
        out += '<li>' + text;
        if(node.firstChild != null){
            out += parseOrderlist(nodes, node) + '</li>'
        } else {
            out += '</li>';
        }
        if(firstChild.next == null) {
            out += '</ol>';
            return out;
        }
        firstChild = firstChild.next;
    }
}

// 分析字符串中的有序列表并按照树形结构的孩子表示法存储
function analyseOrderlist(src, treeNodes, parentNode) {
    let items = src.match(Lexer.rules.item);
    if (items !== null) {
        let lastChildNode;
        for (let index = 0; index < items.length; index++) {
            let item = items[index];
            let result = Lexer.rules.text.exec(item);
            item = item.substring(result[0].length);
            let text = result[1];
            let treeNode = new TreeNode();
            treeNode.element = text;
            treeNodes.push(treeNode);

            let childNode = new ChildNode();
            childNode.index = treeNodes.length - 1;
            if (index === 0) { 
                parentNode.firstChild = childNode;
            } else {
                lastChildNode.next = childNode;
            }
            lastChildNode = childNode;
            if (item === '') {
                treeNode.firstChild = null;
                continue;
            } else {
                analyseOrderlist(item, treeNodes, treeNode);
            }
        }
        lastChildNode.next = null;
    } 
    return;
}