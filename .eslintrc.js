const fabric = require('@umijs/fabric');

module.exports = {
    ...fabric.eslint,
    // extends: [...fabric.eslint.extends],
    rules: {
        ...fabric.eslint.rules,
        'import/no-named-as-default': 0,
        'react/self-closing-comp': 1
    }
};
