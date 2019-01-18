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
            case 'paragraph': {
                this.out += '<p>' + token.text + '</p>\n';
                break;
            }
        }
    });
    return this.out;
}