import { extendTheme } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';

const config = {
  initialColorMode: 'system',
  useSystemColorMode: true,
} as const;

const colors = {
  brand: {
    50: '#E6F6FF',
    100: '#BAE3FF',
    200: '#7CC4FA',
    300: '#47A3F3',
    400: '#2186EB',
    500: '#0967D2',
    600: '#0552B5',
    700: '#03449E',
    800: '#01337D',
    900: '#002159',
  },
  dark: {
    50: '#1a1a1a',
    100: '#2d2d2d',
    200: '#404040',
    300: '#535353',
    400: '#666666',
    500: '#808080',
    600: '#999999',
    700: '#b3b3b3',
    800: '#cccccc',
    900: '#e6e6e6',
  },
  neon: {
    50: '#00FF9D',
    100: '#00FF8F',
    200: '#00FF80',
    300: '#00FF71',
    400: '#00FF62',
    500: '#34C759',
    600: '#2FB850',
    700: '#2AA947',
    800: '#259A3E',
    900: '#208B35',
  },
  bright: {
    50: '#F7FAFC',
    100: '#EDF2F7',
    200: '#E2E8F0',
    300: '#CBD5E0',
    400: '#A0AEC0',
    500: '#718096',
    600: '#4A5568',
    700: '#2D3748',
    800: '#1A202C',
    900: '#171923',
  },
};

const theme = extendTheme({
  styles: {
    global: (props: { colorMode: string }) => ({
      body: {
        bg: mode('gray.50', 'dark.50')(props),
        color: mode('dark.900', 'gray.50')(props),
      },
    }),
  },
  config,
  colors,
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'semibold',
        borderRadius: 'lg',
        _hover: {
          transform: 'translateY(-2px)',
          boxShadow: 'lg',
        },
        _active: {
          transform: 'translateY(0)',
        },
      },
      variants: {
        solid: (props: { colorMode: string }) => ({
          bg: props.colorMode === 'dark' ? 'neon.500' : 'brand.500',
          color: 'white',
          _hover: {
            bg: props.colorMode === 'dark' ? 'neon.600' : 'brand.600',
          },
        }),
      },
    },
    Card: {
      baseStyle: {
        p: '6',
        borderRadius: 'xl',
        boxShadow: 'xl',
        bg: mode('white', 'dark.100'),
      },
    },
  },
});

export default theme;
