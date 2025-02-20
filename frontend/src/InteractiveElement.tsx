import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const glitch = keyframes`
  0% {
    transform: translate(0);
  }
  20% {
    transform: translate(-2px, 2px);
  }
  40% {
    transform: translate(-2px, -2px);
  }
  60% {
    transform: translate(2px, 2px);
  }
  80% {
    transform: translate(2px, -2px);
  }
  100% {
    transform: translate(0);
  }
`;

const InteractiveElement = ({ children }: { children: React.ReactNode }) => {
  const bg = useColorModeValue('dark.50', 'dark.900');
  const color = useColorModeValue('dark.900', 'dark.50');

  return (
    <Box
      bg={bg}
      color={color}
      p={4}
      borderRadius="md"
      boxShadow="md"
      animation={`${glitch} 1.5s infinite`}
    >
      <Text fontWeight="bold" mb={2}>
        {children}
      </Text>
    </Box>
  );
};

export default InteractiveElement;