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
    bold: /(\*{2}|_{2})[^\n]*?\1/g,
    heading: /^ *(#{1,6}) +([^\n]+?)(?:\n+|$)/,
    codeblock: /^ *`{3} *\n{1}([\S\s]*?)\n{0,1}`{3}/,
    orderlist: /^ *[\d]+\. +[^\n]*(?:\n *[\d]+\. +[^\n]*)*/,
    orderitem: /^( *)\d+\. +[^\n]*(\n(?!\1\d+\. +)[^\n]*)*/gm,
    ordertext: /^ *\d+\. +([^\n]*)/,
    disorderlist: /^ *(?:\+|\*|-) +[^\n]*(?:\n *(?:\+|\*|-) +[^\n]*)*/,
    disorderitem: /^( *)(?:\+|\*|-) +[^\n]*(\n(?!\1(\+|\*|-) +)[^\n]*)*/gm,
    disordertext: /^ *(?:\+|\*|-) +([^\n]*)/,
    horizontalrule: /^ *(\*|-|_)\1{2,}/,
    paragraph: /^[^\n]+(?:\n(?!heading|codeblock|orderlist|disorderlist|horizontalrule)[^\n]+)*/
};

Lexer.rules.paragraph = edit(Lexer.rules.paragraph)
.replace('heading',' *#{1,6} +[^\\n]+')
.replace('codeblock',' *`{3} *\\n{1}[\\S\\s]*?\\n`{3}')
.replace('orderlist',' *[\\d]+\\. +')
.replace('disorderlist',' *(\\+|\\*|-) +')
.replace('horizontalrule',' *(\\*|-|_)\\1{2,}')
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
    let boldRuleTexts = src.match(Lexer.rules.bold);
    if (boldRuleTexts != null) {
        boldRuleTexts.forEach(boldRuleText => {
            let boldText = boldRuleText.substring(2, boldRuleText.length - 2);
            boldText = '<strong>' + boldText + '</strong>';
            src = src.replace(boldRuleText, boldText);
        });
    }
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
            let treeNodes = [];
            let treeNode = new TreeNode();
            treeNode.text = 'root';
            treeNodes.push(treeNode);
            
            analyseOrderlist(result[0], treeNodes, treeNode);
            this.tokens.push({
                type: 'orderlist',
                nodes: treeNodes
            });
            continue;
        } else if(result = Lexer.rules.disorderlist.exec(src)) {
            src = src.substring(result[0].length);
            // 初始化根节点
            let treeNodes = [];
            let treeNode = new TreeNode();
            treeNode.text = 'root';
            treeNodes.push(treeNode);
            
            analyseDisorderlist(result[0], treeNodes, treeNode);
            this.tokens.push({
                type: 'disorderlist',
                nodes: treeNodes
            });
            continue;
        } else if(result = Lexer.rules.horizontalrule.exec(src)) {
            src = src.substring(result[0].length)
            this.tokens.push({
                type: 'horizontalrule',
            });
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
                this.out += '<h' + token.level + '>' + token.text + '</h' + token.level +'>';
                break;
            }
            case 'codeblock': {
                this.out += '<pre><code>' + token.text + '</code></pre>';
                break;
            }
            case 'orderlist': {
                nodes = token.nodes;
                this.out += parseOrderlist(nodes, nodes[0]);
                break;
            }
            case 'disorderlist': {
                nodes = token.nodes;
                this.out += parseDisorderlist(nodes, nodes[0]);
                break;
            }
            case 'horizontalrule': {
                this.out += '<hr>';
                break;
            }
            case 'paragraph': {
                this.out += '<p>' + token.text + '</p>';
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

// 解析有序列表为html代码
function parseDisorderlist(nodes, node) {
    let out = '';
    let firstChild = node.firstChild;
    if(firstChild === null) {
        return out;
    }
    out += '<ul>';
    while(true) {
        let node = nodes[firstChild.index];
        let text = node.element;
        out += '<li>' + text;
        if(node.firstChild != null){
            out += parseDisorderlist(nodes, node) + '</li>'
        } else {
            out += '</li>';
        }
        if(firstChild.next == null) {
            out += '</ul>';
            return out;
        }
        firstChild = firstChild.next;
    }
}

// 分析字符串中的有序列表并按照树形结构的孩子表示法存储
function analyseOrderlist(src, treeNodes, parentNode) {
    let items = src.match(Lexer.rules.orderitem);
    if (items !== null) {
        let lastChildNode;
        for (let index = 0; index < items.length; index++) {
            let item = items[index];
            let result = Lexer.rules.ordertext.exec(item);
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

// 分析字符串中的无序列表并按照树形结构的孩子表示法存储
function analyseDisorderlist(src, treeNodes, parentNode) {
    let items = src.match(Lexer.rules.disorderitem);
    if (items !== null) {
        let lastChildNode;
        for (let index = 0; index < items.length; index++) {
            let item = items[index];
            let result = Lexer.rules.disordertext.exec(item);
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
                analyseDisorderlist(item, treeNodes, treeNode);
            }
        }
        lastChildNode.next = null;
    } 
    return;
}