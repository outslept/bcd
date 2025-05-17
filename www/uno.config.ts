import {
  defineConfig,
  presetIcons,
  presetWebFonts,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'
import type { IconifyJSON } from '@iconify/types'

export default defineConfig({
  presets: [
    presetWind3(),
    presetIcons({
      scale: 1.2,
      warn: true,
      collections: {
        carbon: () => import('@iconify-json/carbon/icons.json').then(i => i.default as IconifyJSON),
        logos: () => import('@iconify-json/logos/icons.json').then(i => i.default as IconifyJSON),
        ph: () => import('@iconify-json/ph/icons.json').then(i => i.default as IconifyJSON),
      },
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
    }),
    presetWebFonts({
      provider: 'google',
      fonts: {
        sans: 'Inter:400,500,600,700',
      },
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
  theme: {
    extend: {
      colors: {
        'pattern-fg-dark': 'rgba(255,255,255,0.03)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-out': { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        'slide-up-and-fade': { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'hide': { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        'slide-in': { 'from': { transform: 'translateX(calc(100% + var(--viewport-padding)))' }, 'to': { transform: 'translateX(0)' } },
        'swipe-out': { 'from': { transform: 'translateX(var(--radix-toast-swipe-end-x))' }, 'to': { transform: 'translateX(calc(100% + var(--viewport-padding)))' } },
        'spin': { 'to': { transform: 'rotate(360deg)' } },
        'content-show': { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'content-hide': { from: { opacity: '1', transform: 'scale(1)' }, to: { opacity: '0', transform: 'scale(0.96)' } },
        'zoom-in-95': { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'zoom-out-95': { from: { opacity: '1', transform: 'scale(1)' }, to: { opacity: '0', transform: 'scale(0.95)' } },
        'slide-in-from-top-2': { from: { transform: 'translateY(-0.5rem)', opacity: '0'}, to: {transform: 'translateY(0)', opacity: '1'} },
        'slide-in-from-bottom-2': { from: { transform: 'translateY(0.5rem)', opacity: '0'}, to: {transform: 'translateY(0)', opacity: '1'} },
        'slide-in-from-left-2': { from: { transform: 'translateX(-0.5rem)', opacity: '0'}, to: {transform: 'translateX(0)', opacity: '1'} },
        'slide-in-from-right-2': { from: { transform: 'translateX(0.5rem)', opacity: '0'}, to: {transform: 'translateX(0)', opacity: '1'} },
        'slide-out-to-right-full': {from: {transform: 'translateX(0)', opacity: '1'}, to: {transform: 'translateX(100%)', opacity: '0'}},
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out forwards',
        'fade-out': 'fade-out 0.2s ease-in forwards',
        'slide-up-and-fade': 'slide-up-and-fade 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'hide': 'hide 100ms ease-in forwards',
        'slide-in': 'slide-in 150ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'swipe-out': 'swipe-out 100ms ease-out forwards',
        'spin': 'spin 1s linear infinite',
        'in': 'content-show 0.2s ease-out forwards',
        'out': 'content-hide 0.2s ease-out forwards',
        'zoom-in-95': 'zoom-in-95 0.2s ease-out forwards',
        'zoom-out-95': 'zoom-out-95 0.2s ease-out forwards',
        'slide-in-from-top-2': 'slide-in-from-top-2 0.2s ease-out forwards',
        'slide-in-from-bottom-2': 'slide-in-from-bottom-2 0.2s ease-out forwards',
        'slide-in-from-left-2': 'slide-in-from-left-2 0.2s ease-out forwards',
        'slide-in-from-right-2': 'slide-in-from-right-2 0.2s ease-out forwards',
        'slide-out-to-right-full': 'slide-out-to-right-full 0.2s ease-out forwards',
      },
    },
  },
})
