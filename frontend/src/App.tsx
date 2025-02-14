import {
  Box,
  Flex,
  Heading,
  IconButton,
  useColorMode,
  Text,
  Button,
  Input
} from '@chakra-ui/react';
import { SunIcon, MoonIcon, HamburgerIcon } from '@chakra-ui/icons';
import { useState } from 'react';
import ChatMessage from './ChatMessage';

function App() {
  const { colorMode, toggleColorMode } = useColorMode();
  const [showSidebar, setShowSidebar] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ message: string; user: string; isCurrentUser?: boolean }[]>([]);

  return (
    <Flex h="100vh" overflow="hidden">
      {/* Sidebar */}
      <Box
        w={{ base: '240px', lg: '280px' }}
        bg={colorMode === 'light' ? 'gray.100' : 'gray.800'}
        p={4}
        display={{ base: showSidebar ? 'block' : 'none', md: 'block' }}
        position={{ base: 'fixed', md: 'static' }}
        h="100vh"
        zIndex={20}
        borderRight="1px"
        borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
        transition="all 0.2s"
      >
        <Heading size="md">Channels</Heading>
        {/* Placeholder for channel list */}
        <Box mt={4}>
          <Button variant="ghost" justifyContent="flex-start" width="100%">#general</Button>
          <Button variant="ghost" justifyContent="flex-start" width="100%">#random</Button>
          <Button variant="ghost" justifyContent="flex-start" width="100%">#projects</Button>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Flex 
        direction="column" 
        flex="1"
        ml={{ base: 0, md: '240px', lg: '280px' }}
        transition="margin 0.2s"
      >
        {/* Top Navigation */}
        <Flex
          as="header"
          p={{ base: 2, md: 4 }}
          bg={colorMode === 'light' ? 'white' : 'gray.800'}
          borderBottom="1px solid"
          borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
          align="center"
          position="sticky"
          top={0}
          zIndex={10}
        >
          <IconButton
            aria-label="Open sidebar"
            icon={<HamburgerIcon />}
            onClick={() => setShowSidebar(!showSidebar)}
            display={{ base: 'block', md: 'none' }}
            mr={2}
          />
          <Heading size="md">XCord</Heading>
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            ml="auto"
            variant="ghost"
          />
        </Flex>

        {/* Chat Area */}
        <Box 
          flex="1" 
          p={{ base: 2, md: 4 }} 
          bg={colorMode === 'light' ? 'gray.50' : 'gray.900'} 
          overflowY="auto"
        >
          <Flex direction="column" maxW="container.md" mx="auto" h="full">
            {messages.map((msg, index) => (
              <ChatMessage key={index} message={msg.message} user={msg.user} isCurrentUser={msg.isCurrentUser} />
            ))}
          </Flex>
        </Box>

        {/* Message Input */}
        <Flex 
          p={{ base: 2, md: 4 }} 
          bg={colorMode === 'light' ? 'white' : 'gray.800'}
          borderTop="1px solid"
          borderColor={colorMode === 'light' ? 'gray.200' : 'gray.700'}
          maxW="container.md"
          mx="auto"
          w="full"
        >
          <Input
            placeholder="Type a message..."
            mr={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            bg={colorMode === 'light' ? 'white' : 'gray.700'}
            _placeholder={{ color: colorMode === 'light' ? 'gray.500' : 'gray.400' }}
          />
          <Button 
            colorScheme="blue" 
            onClick={sendMessage}
            px={6}
          >
            Send
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );

  function sendMessage() {
    setMessages([...messages, { message: message, user: 'Me', isCurrentUser: true }]);
    setMessage('');
  }
}

export default App;
