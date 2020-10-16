const getAuthHeader = ({ auth, env, logger }) => {
    const type = "Bearer";
    const user = env[auth.userEnvVar];
    const password = env[auth.passEnvVar];
    const token = env[auth.tokenEnvVar];
  
    //   logger.debug({ type, user, password });
  
    if (!type || !token) {
      logger.error("failed to generate auth header, type or token missing");
      return false;
    }
    return `${type} ${token}`;
  };
  
  module.exports = getAuthHeader;