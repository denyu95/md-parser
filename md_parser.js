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
            let forest = []
            let index = 0;
            src = src.substring(cap[0].length);
            items = cap[0].match(Lexer.rules.items);
            for(let i = 0; i < items.length; i++) {
                let tree = [];
                item = items[i];
                texts = Lexer.rules.text.exec(item);
                text = item.substring(texts[0].length);
                let parentItem = new Item();
                parentItem.index = index;
                parentItem.text = texts[1];
                parentItem.parent = -1;
                parentItem.floor = 1;
                tree.push(parentItem);
                index++;
                secondItems = text.match(Lexer.rules.items);
                if(secondItems !== null) {
                    for(let j = 0; j < secondItems.length; j++) {
                        secondItem = secondItems[j];
                        secondTexts = Lexer.rules.text.exec(secondItem);
                        secondText = secondItem.substring(secondTexts[0].length);
                        let childItem = new Item();
                        childItem.index = index;
                        childItem.text = secondTexts[1];
                        childItem.parent = parentItem.index;
                        childItem.floor = 2;
                        tree.push(childItem);
                        index++;
                        thirdItems = secondText.match(Lexer.rules.items);
                        if(thirdItems !== null) {
                            for(let z = 0; z < thirdItems.length; z++) {
                                thirdItem = thirdItems[z];
                                thirdTexts = Lexer.rules.text.exec(thirdItem);
                                let grandsonItem = new Item();
                                grandsonItem.index = index;
                                grandsonItem.text = thirdTexts[1];
                                grandsonItem.parent = childItem.index;
                                grandsonItem.floor = 3;
                                if (z === thirdItems.length-1) {
                                    grandsonItem.last = true;
                                }
                                tree.push(grandsonItem);
                                index++;
                            }
                            childItem.flag = true;
                        } else {
                            childItem.flag = false;
                        }
                    }
                    parentItem.flag = true;
                } else {
                    parentItem.flag = false;
                }
                forest.push(tree)
            }
            this.tokens.push({
                type: 'orderedlist',
                text: forest
            })
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
                console.log(token.text)
                forest = token.text;
                let liout = '';
                for(let j = 0; j < forest.length; j++) {
                    let listr = '';
                    items = forest[j];
                    for(let i = items.length-1; i >= 0; i--) {
                        if (items[i].floor === 1 && i === items.length-1) {
                            listr = '<li>' + items[i].text + '</li>';
                        } else if (items[i].floor === 2 && i === items.length-1) {
                            listr = '<li>' + items[i].text + '</li>' + '</ol>' + '</li>';
                        } else if (items[i].floor === 3 && i === items.length-1) {
                            listr = '<li>' + items[i].text +'</li>' + '</ol>' + '</li>' + '</ol>' + '</li>';
                        } else if (items[i].flag === true) {
                            listr = '<li>' +  items[i].text + '<ol>' + listr;
                        } else if (items[i].last == true) {
                            listr = '<li>' + items[i].text +'</li>' + '</ol>' + listr;
                        } else {
                            listr = '<li>' + items[i].text +'</li>' + listr;
                        } 
                    }
                    liout += listr;
                }
                this.out +='<ol>' + liout + '</ol>';
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