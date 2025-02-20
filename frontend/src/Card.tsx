import { Box, Text, useColorModeValue } from '@chakra-ui/react';

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const Card = ({ title, children, className }: CardProps) => {
  const bg = useColorModeValue('dark.50', 'dark.900');
  const color = useColorModeValue('dark.900', 'dark.50');

  return (
    <Box bg={bg} color={color} p={4} borderRadius="md" boxShadow="md" className={className}>
      <Text fontWeight="bold" mb={2}>
        {title}
      </Text>
      {children}
    </Box>
  );
};

export default Card;