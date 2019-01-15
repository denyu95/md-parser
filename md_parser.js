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
    heading: /^ *(#{1,6}) +([^\n]+?)(?:\n+|$)/
};

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
            }
        }
    });
    return this.out;
}