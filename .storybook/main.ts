import type { StorybookConfig } from '@storybook/nextjs'

const config: StorybookConfig = {
  stories: [
    '../shared/**/*.stories.@(ts|tsx)',
    '../widgets/**/*.stories.@(ts|tsx)',
    '../features/**/*.stories.@(ts|tsx)',
  ],
  addons: ['@storybook/addon-themes'],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  staticDirs: ['../public'],
}

export default config
