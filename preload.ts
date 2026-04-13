import { plugin } from 'bun'

plugin({
  name: 'bun-bundle-shim',
  setup(build) {
    build.module('bun:bundle', () => {
      return {
        exports: {
          feature(name: string): boolean {
            return true
          },
        },
        loader: 'object',
      }
    })
  },
})
