export default {
    entry: 'src/index.ts',
    esm: "rollup",
    umd: {
        name: 'requex',
        minFile: true
    },
    extraBabelPlugins: [
        ['babel-plugin-import', {
            "libraryName": "lodash",
            "libraryDirectory": "",
            "camel2DashComponentName": false,
        }]
    ]
}