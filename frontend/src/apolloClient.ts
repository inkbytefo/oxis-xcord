import { ApolloClient, InMemoryCache } from '@apollo/client';

export const client = new ApolloClient({
  uri: 'http://localhost:3000/graphql', // Update with your actual GraphQL endpoint
  cache: new InMemoryCache(),
});
