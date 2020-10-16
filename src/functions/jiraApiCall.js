import JiraClient from 'jira-connector';

export function makeClient(pluginConfig, context) {
  const { env } = context
  return new JiraClient({
    host: pluginConfig.jiraHost,
    basic_auth: {
      base64: env[auth.jiraAuthVar]
    },
  });
}