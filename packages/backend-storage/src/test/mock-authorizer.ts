export const handler = async (event: any) => {
  const { operation, key, identity } = event;
  
  // Test authorizer that allows all operations for testing
  return {
    isAuthorized: true
  };
};