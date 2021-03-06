'use strict';

const astUtils = require('eslint/lib/rules/utils/ast-utils');

const meta =
{
    docs:
    {
        description:
        'enforce consistent spacing before the opening parenthesis in a function definition',
        category: 'Stylistic Issues',
    },
    fixable: 'whitespace',
    schema: [],
};

function create(context)
{
    const sourceCode = context.getSourceCode();

    /**
     * Determines whether a function has a name.
     * @param {ASTNode} node The function node.
     * @returns {boolean} Whether the function has a name.
     */
    function isNamedFunction(node)
    {
        if (node.id)
            return true;
        const { parent } = node;
        const { type } = parent;
        const namedFunction =
        type === 'MethodDefinition' ||
        type === 'Property' && (parent.kind === 'get' || parent.kind === 'set' || parent.method);
        return namedFunction;
    }

    /**
     * Gets the config for a given function.
     * @param {ASTNode} node The function node.
     * @returns {string} 'always', 'never', or 'ignore'.
     */
    function getConfigForFunction(node)
    {
        if (isNamedFunction(node) || node.typeParameters)
            return 'never';
        if (node.type === 'ArrowFunctionExpression')
        {
            // Always ignore non-async arrow functions and arrow functions without parens, e.g.
            // `async foo => bar`.
            if
            (
                !node.async ||
                !astUtils.isOpeningParenToken(sourceCode.getFirstToken(node, { skip: 1 }))
            )
                return 'ignore';
        }
        return 'always';
    }

    /**
     * Checks the parens of a function node.
     * @param {ASTNode} node A function node.
     * @returns {void}
     */
    function checkFunction(node)
    {
        const functionConfig = getConfigForFunction(node);
        if (functionConfig === 'ignore')
            return;
        const rightToken = sourceCode.getFirstToken(node, astUtils.isOpeningParenToken);
        const leftToken = sourceCode.getTokenBefore(rightToken);
        const text =
        sourceCode
        .text
        .slice(leftToken.range[1], rightToken.range[0])
        .replace(/\/\*[^]*?\*\//g, '');
        if (astUtils.LINEBREAK_MATCHER.test(text))
            return;
        const hasSpacing = /\s/.test(text);
        if (hasSpacing && functionConfig === 'never')
        {
            const report =
            {
                node,
                loc: leftToken.loc.end,
                message: 'Unexpected space before function parentheses.',
                fix: fixer => fixer.removeRange([leftToken.range[1], rightToken.range[0]]),
            };
            context.report(report);
        }
        else if (!hasSpacing && functionConfig === 'always')
        {
            const report =
            {
                node,
                loc: leftToken.loc.end,
                message: 'Missing space before function parentheses.',
                fix: fixer => fixer.insertTextAfter(leftToken, ' '),
            };
            context.report(report);
        }
    }

    const result =
    {
        ArrowFunctionExpression: checkFunction,
        FunctionDeclaration: checkFunction,
        FunctionExpression: checkFunction,
    };
    return result;
}

module.exports = { meta, create };
