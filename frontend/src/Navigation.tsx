import { Box, Flex, Button, useColorMode, useBreakpointValue, Fade } from '@chakra-ui/react';
import Image from 'next/image';
import { motion } from 'framer-motion';

const Navigation = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const buttonSize = useBreakpointValue({ base: 'sm', md: 'md' });

  const MotionBox = motion(Box);

  return (
    <MotionBox
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      bg="dark.900"
      px={4}
      py={2}
      boxShadow="lg"
      position="sticky"
      top={0}
      zIndex={1000}
    >
      <Flex justify="space-between" align="center" maxW="7xl" mx="auto">
        <Fade in={true}>
          <Box color="neon.500" fontWeight="bold" position="relative" h="50px" w="150px">
            <Image
              src="/logo.png"
              alt="Rebel Neo Gotham Logo"
              layout="fill"
              objectFit="contain"
              priority
            />
          </Box>
        </Fade>
        <Button
          onClick={toggleColorMode}
          variant="ghost"
          color="bright.500"
          size={buttonSize}
          _hover={{ bg: 'dark.800' }}
          _active={{ bg: 'dark.700' }}
          leftIcon={<Box as="span">{colorMode === 'light' ? '☀️' : '🌙'}</Box>}
        >
          {colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
        </Button>
      </Flex>
    </MotionBox>
  );
};

export default Navigation;