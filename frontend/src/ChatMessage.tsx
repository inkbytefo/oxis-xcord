import { Box, Text } from '@chakra-ui/react';

interface ChatMessageProps {
  message: string;
  user: string;
  isCurrentUser?: boolean;
}

function ChatMessage({ message, user, isCurrentUser = false }: ChatMessageProps) {
  return (
    <Box
      mb={2}
      p={2}
      borderRadius="md"
      bg={isCurrentUser ? 'blue.100' : 'gray.200'}
      alignSelf={isCurrentUser ? 'flex-end' : 'flex-start'}
      maxWidth="70%"
    >
      <Text fontWeight="bold">{user}:</Text>
      <Text>{message}</Text>
    </Box>
  );
}

export default ChatMessage;
