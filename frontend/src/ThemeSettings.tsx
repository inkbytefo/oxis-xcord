import { Box, Button, useColorMode, useColorModeValue } from '@chakra-ui/react';

const ThemeSettings = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue('dark.50', 'dark.900');
  const color = useColorModeValue('dark.900', 'dark.50');

  return (
    <Box bg={bg} color={color} p={4} borderRadius="md" boxShadow="md">
      <Button onClick={toggleColorMode} variant="ghost" color="bright.500">
        {colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
      </Button>
    </Box>
  );
};

export default ThemeSettings;