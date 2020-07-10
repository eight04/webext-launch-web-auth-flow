import cjs from 'rollup-plugin-cjs-es';
import {terser} from 'rollup-plugin-terser';
import camelcase from 'camelcase';
import babel from '@rollup/plugin-babel';

const {npm_package_name} = process.env;

export default {
  input: 'index.js',
  output: [
    {
      file: `dist/${npm_package_name}.js`,
      format: 'iife',
      name: camelcase(npm_package_name),
      sourcemap: true
    },
    {
      file: `dist/${npm_package_name}.min.js`,
      format: 'iife',
      name: camelcase(npm_package_name),
      sourcemap: true,
      plugins: [terser()]
    }
  ],
  plugins: [
    cjs(),
    babel({
      babelHelpers: "bundled",
      presets: [
        ["@babel/env",
        {
          targets: {
            chrome: "49"
          },
          // https://github.com/facebook/regenerator/issues/276
          include: ["transform-template-literals"],
          exclude: ["transform-regenerator"]
        }]
      ]
    })
  ]
};
