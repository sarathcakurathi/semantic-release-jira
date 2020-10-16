import { makeClient } from './functions/jiraApiCall.js';
const getAuthHeader = require("./functions/getAuthHeader.js");


/**
 * Get jira tickets from commit message
 *
 * @async
 * @param {object} config config passed in by semantic-release
 * @param {object} context plugin context passed in by semantic-release
 */
export function getTickets(config, context) {
    let patterns = [];
  
    if (config.ticketRegex !== undefined) {
      patterns = [new RegExp(config.ticketRegex, 'giu')];
    }
  
    const tickets = new Set();
    for (const commit of context.commits) {
      for (const pattern of patterns) {
        const matches = commit.message.match(pattern);
        if (matches) {
          matches.forEach(match => {
            tickets.add(match);
            context.logger.info(`Found ticket ${matches} in commit: ${commit.commit.short}`);
          });
        }
      }
    }
  
    return [...tickets];
  }

async function validateIssue(config, context, jira, issueId) {
    try {
      context.logger.info(`Finding issue ${issueId}`);
      validStatuses = ['In Progress']
      if (!config.dryRun) {
        let response = await jira.issue.getIssue({
          issueKey: issueId
        });

        if (response.status == 200) {
            let json = await response.json(); 
            if ('status' in json) {
                status = json.status.name
                if (!validStatuses.indexOf(status) >= 0) {
                    context.logger.error(`Issue: ${issueId} is not in a valid state`)
                    return false
                }
                else {
                    return true
                }
            }
            else if ('errorMessages' in json) {
                context.logger.error(`Issue doesnot exist: ${json.errorMessages}`);
                return false
            }
        }
      }
    } catch (err) {
      const allowedStatusCodes = [400, 404];
      let { statusCode } = err;
      if (typeof err === 'string') {
        try {
          err = JSON.parse(err);
          statusCode = statusCode || err.statusCode;
        } catch (err) {
            // it's not json :shrug:
        }
      }
      if (allowedStatusCodes.indexOf(statusCode) === -1) {
        throw err;
      }
      context.logger.error(`Unable to get issue ${issueKey} statusCode: ${statusCode}`);
    }
  }
  
/**
 * success plugin method which updates JIRA Issues
 *
 * @async
 * @param {object} pluginConfig config passed in by semantic-release
 * @param {object} context plugin context passed in by semantic-release
 */
async function success(pluginConfig, context) {
  const {
    commits,
    nextRelease: { version },
    env,
    logger,
  } = context;
  const { auth } = pluginConfig;

  const authHeader = getAuthHeader({ auth, env, logger });
  if (!authHeader) {
    return;
  }

  const tickets = getTickets(pluginConfig, context)

  const jira = makeClient(pluginConfig, context)

  let validations = []
  for (ticket in tickets) {
    validations.push(validateIssue(pluginConfig, context, jira, ticket))
  }

  context.logger.info(validations)
  let result = validations.every(v => v)
  context.logger(result)
}

module.exports = success;